import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Order, OrderItem } from '@/types/orders';
import { notFound } from 'next/navigation';
import OrderStatusEditor from '@/components/admin/OrderStatusEditor';

async function getOrder(orderId: string): Promise<Order | null> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Order fetch error:', error);
    throw new Error(`Sipariş yüklenirken hata oluştu: ${error.message}`);
  }

  return data;
}

async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı.');
  }

  // Fetch order items
  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, quantity, unit_price, price')
    .eq('order_id', orderId)
    .order('id', { ascending: true });

  if (itemsError) {
    console.error('Order items fetch error:', itemsError, JSON.stringify(itemsError));
    throw new Error(`Sipariş ürünleri yüklenirken hata oluştu: ${itemsError.message}`);
  }

  if (!itemsData || itemsData.length === 0) {
    return [];
  }

  // Get unique product IDs
  const productIds = [...new Set(itemsData.map((item: any) => item.product_id))];

  // Fetch product names
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds);

  // Create a map of product_id -> product_name
  const productNameMap = new Map<string, string>();
  if (productsData) {
    productsData.forEach((product: any) => {
      productNameMap.set(product.id, product.name);
    });
  }

  // Map the data to match OrderItem type
  return itemsData.map((item: any) => {
    const unit = item.unit_price ?? 0;
    const lineTotal = item.price ?? unit * item.quantity;

    return {
      id: item.id,
      created_at: new Date().toISOString(), // order_items table doesn't have created_at
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: productNameMap.get(item.product_id) || 'Ürün adı bulunamadı',
      unit_price: unit,
      quantity: item.quantity,
      line_total: lineTotal,
    };
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusBadge(status: string): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    yeni: { label: 'Yeni', className: 'bg-blue-100 text-blue-800' },
    'hazırlanıyor': { label: 'Hazırlanıyor', className: 'bg-yellow-100 text-yellow-800' },
    hazirlaniyor: { label: 'Hazırlanıyor', className: 'bg-yellow-100 text-yellow-800' },
    kargoda: { label: 'Kargoda', className: 'bg-purple-100 text-purple-800' },
    kargoya_verildi: { label: 'Kargoya Verildi', className: 'bg-purple-100 text-purple-800' },
    tamamlandı: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800' },
    tamamlandi: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800' },
    iptal: { label: 'İptal', className: 'bg-red-100 text-red-800' },
  };

  return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
}

function getPaymentMethodLabel(method: string): string {
  const methodMap: Record<string, string> = {
    havale: 'Havale',
    kapida: 'Kapıda Ödeme',
  };
  return methodMap[method] || method;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSiparisDetayPage({ params }: Props) {
  const { id: orderId } = await params;

  let order: Order | null = null;
  let orderItems: OrderItem[] = [];
  let error: string | null = null;

  try {
    order = await getOrder(orderId);
    if (!order) {
      return (
        <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Sipariş Bulunamadı</h1>
              <p className="text-gray-600 mb-6">
                Belirtilen ID&apos;ye sahip bir sipariş bulunamadı.
              </p>
              <Link
                href="/admin/siparisler"
                className="px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors inline-block"
              >
                Sipariş Listesine Dön
              </Link>
            </div>
          </div>
        </main>
      );
    }

    orderItems = await getOrderItems(orderId);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-semibold">Hata</p>
            <p>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const statusBadge = getStatusBadge(order!.status);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/admin/siparisler"
            className="text-green-700 hover:text-green-800 font-medium"
          >
            ← Sipariş Listesine Dön
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Sipariş Detayı</h1>

        {/* Order Information */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Bilgileri</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Sipariş ID</h3>
              <p className="text-gray-900 font-mono text-sm">{order!.id}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Sipariş Tarihi</h3>
              <p className="text-gray-900">{formatDate(order!.created_at)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Durum</h3>
              <div className="space-y-2">
                <span className={`px-3 py-1 rounded text-sm font-semibold ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
                <OrderStatusEditor orderId={order!.id} initialStatus={order!.status ?? 'yeni'} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Ödeme Yöntemi</h3>
              <p className="text-gray-900">{getPaymentMethodLabel(order!.payment_method)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Müşteri Adı</h3>
              <p className="text-gray-900">{order!.customer_name}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Telefon</h3>
              <p className="text-gray-900">{order!.phone}</p>
            </div>

            {order!.email && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">E-posta</h3>
                <p className="text-gray-900">{order!.email}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Adres</h3>
              <p className="text-gray-900">{order!.address}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">İl</h3>
              <p className="text-gray-900">{order!.city}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">İlçe</h3>
              <p className="text-gray-900">{order!.district}</p>
            </div>

            {order!.note && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Not</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{order!.note}</p>
              </div>
            )}

            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Toplam Tutar</h3>
              <p className="text-3xl font-bold text-green-700">
                {formatPrice(order!.total_price)} ₺
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Ürünleri</h2>

          {orderItems.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Bu siparişte ürün bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ürün Adı</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      Birim Fiyat
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Adet</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ara Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatPrice(item.unit_price)} ₺
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatPrice(item.line_total)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-900">
                      Toplam:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xl text-green-700">
                      {formatPrice(order!.total_price)} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
