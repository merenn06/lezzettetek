import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Order } from '@/types/orders';

// Disable caching for admin orders page to always show latest data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getOrders(): Promise<Partial<Order>[]> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, phone, city, district, payment_method, status, total_price')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Orders fetch error:', error);
    throw new Error(`Siparişler yüklenirken hata oluştu: ${error.message}`);
  }

  return (data || []) as Partial<Order>[];
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

export default async function AdminSiparislerPage() {
  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = (await getOrders()) as unknown as Order[];
  } catch (err) {
    error = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Sipariş Yönetimi</h1>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Hata</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Listesi</h2>

            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Henüz sipariş bulunmamaktadır.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tarih</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Müşteri</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Telefon</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">İl/İlçe</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Ödeme</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Toplam</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const statusBadge = getStatusBadge(order.status);
                      return (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-700 text-sm">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {order.customer_name}
                          </td>
                          <td className="py-3 px-4 text-gray-700">{order.phone}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {order.city} / {order.district}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {getPaymentMethodLabel(order.payment_method)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {formatPrice(order.total_price)} ₺
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/admin/siparisler/${order.id}`}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors inline-block"
                            >
                              Detay
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
