import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Order } from '@/types/orders';

// Disable caching for admin orders page to always show latest data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const ORDER_LIST_COLUMNS =
  'id, created_at, customer_name, phone, city, district, payment_method, shipping_payment_type, status, total_price';

type OrdersPageResult = {
  orders: Partial<Order>[];
  page: number;
  totalCount: number;
  totalPages: number;
};

async function getOrdersPage(requestedPage: number): Promise<OrdersPageResult> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı.');
  }

  const { count, error: countError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error('Orders count error:', countError);
    throw new Error(`Sipariş sayısı alınamadı: ${countError.message}`);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Orders fetch error:', error);
    throw new Error(`Siparişler yüklenirken hata oluştu: ${error.message}`);
  }

  return {
    orders: (data || []) as Partial<Order>[],
    page,
    totalCount,
    totalPages,
  };
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

function getPaymentMethodLabel(method: string, shippingPaymentType?: "cash" | "card" | null): string {
  if (method === 'iyzico') {
    return 'Online Kart';
  }

  if (method === 'kapida' || method === 'cod') {
    if (shippingPaymentType === 'cash') {
      return 'Kapıda Nakit';
    }
    return 'Kapıda Kart';
  }

  if (method === 'havale') {
    return 'Havale';
  }

  return method;
}

type AdminSiparislerPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminSiparislerPage({ searchParams }: AdminSiparislerPageProps) {
  const params = await searchParams;
  const rawPage = parseInt(String(params.page ?? '1'), 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  let orders: Order[] = [];
  let error: string | null = null;
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;

  try {
    const result = await getOrdersPage(requestedPage);
    orders = result.orders as unknown as Order[];
    page = result.page;
    totalPages = result.totalPages;
    totalCount = result.totalCount;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
  }

  const basePath = '/admin/siparisler';
  const prevHref = page > 1 ? `${basePath}?page=${page - 1}` : null;
  const nextHref = page < totalPages ? `${basePath}?page=${page + 1}` : null;
  const fromRow = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRow = Math.min(page * PAGE_SIZE, totalCount);

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
              <>
              <p className="text-sm text-gray-600 mb-4">
                Toplam {totalCount.toLocaleString('tr-TR')} sipariş — {fromRow}–{toRow} arası gösteriliyor
                {' · '}
                Sayfa {page} / {totalPages}
              </p>
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
                            {getPaymentMethodLabel(
                              order.payment_method as string,
                              order.shipping_payment_type as "cash" | "card" | null
                            )}
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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-600">
                  Sayfa başına {PAGE_SIZE} sipariş
                </div>
                <div className="flex gap-2">
                  {prevHref ? (
                    <Link
                      href={prevHref}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      ← Önceki
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
                      ← Önceki
                    </span>
                  )}
                  {nextHref ? (
                    <Link
                      href={nextHref}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      Sonraki →
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
                      Sonraki →
                    </span>
                  )}
                </div>
              </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
