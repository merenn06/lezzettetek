import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Order, OrderItem } from '@/types/orders';
import { notFound } from 'next/navigation';
import OrderStatusEditor from '@/components/admin/OrderStatusEditor';
import YurticiShipButton from '@/components/admin/YurticiShipButton';
import RefreshTrackingButton from '@/components/admin/RefreshTrackingButton';
import PrintBarcodeButton from '@/components/admin/PrintBarcodeButton';
import PrintCollectionLabelButton from '@/components/admin/PrintCollectionLabelButton';
import CODPaymentTypeEditor from '@/components/admin/CODPaymentTypeEditor';
import { fetchOrderSeqFromYurtici, queryYurticiShipment } from '@/lib/shipping/yurtici';

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
    iyzico: 'Online Ödeme',
  };
  return methodMap[method] || method;
}

function getPaymentStatusBadge(paymentMethod: string, paymentStatus: string | null | undefined, orderStatus: string): { label: string; className: string } {
  // Check if payment method is COD: 'cod' or 'kapida'
  const isCOD = paymentMethod === 'cod' || paymentMethod === 'kapida';
  
  // Check if payment method is online: 'iyzico' or 'havale'
  const isOnline = paymentMethod === 'iyzico' || paymentMethod === 'havale';
  
  // Normalize payment status
  const status = paymentStatus || 
    (orderStatus === 'paid' ? 'paid' : 
     orderStatus === 'pending_payment' ? 'awaiting_payment' :
     orderStatus === 'payment_failed' ? 'failed' :
     'unpaid');

  if (isOnline) {
    if (status === 'paid') {
      return { label: 'Online ödeme - Paid', className: 'bg-green-100 text-green-800' };
    }
    return { label: `Online ödeme - ${status}`, className: 'bg-yellow-100 text-yellow-800' };
  }

  if (isCOD) {
    if (status === 'awaiting_payment') {
      return { label: 'Kapıda ödeme – Tahsilat bekleniyor', className: 'bg-blue-100 text-blue-800' };
    }
    if (status === 'paid') {
      return { label: 'Kapıda ödeme - Paid', className: 'bg-green-100 text-green-800' };
    }
    return { label: `Kapıda ödeme - ${status}`, className: 'bg-gray-100 text-gray-800' };
  }

  return { label: `${paymentMethod} - ${status}`, className: 'bg-gray-100 text-gray-800' };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSiparisDetayPage({ params }: Props) {
  const { id: orderId } = await params;

  let order: Order | null = null;
  let orderItems: OrderItem[] = [];
  let error: string | null = null;
  let reportDocsSummary:
    | {
        documentType: string | null;
        docId: string | null;
        docNumber: string | null;
        fieldName: string | null;
        fieldValue: string | null;
      }[]
    | null = null;

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

    // For COD orders, fetch compact Report document summaries (no PII) for debug UI
    const isCOD = order.payment_method === 'cod' || order.payment_method === 'kapida';
    if (isCOD && order.shipping_reference_number) {
      const apiUser = process.env.YURTICI_USER_STD || process.env.YURTICI_USER_GO;
      const apiPass = process.env.YURTICI_PASS_STD || process.env.YURTICI_PASS_GO;
      const userLanguage = process.env.YURTICI_LANG || 'TR';

      if (apiUser && apiPass) {
        try {
          const reportRes = await fetchOrderSeqFromYurtici(
            order.shipping_reference_number,
            apiUser,
            apiPass,
            userLanguage
          );
          reportDocsSummary = reportRes.reportDocumentsSummary ?? null;
        } catch (reportErr) {
          console.error('[admin-order] Failed to fetch reportDocsSummary for debug:', reportErr);
        }
      }
    }

    // For Yurtiçi shipments, fetch latest tracking info directly via SOAP helper
    let yurticiTracking: any = null;
    if (order.shipping_carrier === 'yurtici' && order.shipping_reference_number) {
      const apiUser = process.env.YURTICI_USER_STD || process.env.YURTICI_USER_GO;
      const apiPass = process.env.YURTICI_PASS_STD || process.env.YURTICI_PASS_GO;
      const userLanguage = process.env.YURTICI_LANG || 'TR';

      if (apiUser && apiPass) {
        try {
          yurticiTracking = await queryYurticiShipment(
            order.shipping_reference_number,
            apiUser,
            apiPass,
            userLanguage
          );
        } catch (trackErr) {
          console.error('[admin-order] Failed to fetch Yurtici tracking info:', trackErr);
        }
      }
    }

    // Attach tracking info to order object for easier render
    (order as any)._yurticiTracking = yurticiTracking;
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
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Yurtiçi Kargo</h4>
                  <YurticiShipButton 
                    orderId={order!.id} 
                    existingTracking={order!.shipping_tracking_number}
                    order={order}
                  />
                  {/* Show "Barkodu Yenile" button if status is created_pending_barcode OR if reference exists but tracking doesn't */}
                  {(order!.shipping_status === "created_pending_barcode" || (order!.shipping_reference_number && !order!.shipping_tracking_number)) && (
                    <div className="mt-3">
                      <RefreshTrackingButton orderId={order!.id} />
                    </div>
                  )}
                  {order!.shipping_tracking_number && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Kargo Takip No:</span> {order!.shipping_tracking_number}
                      </p>
                    </div>
                  )}
                  {order!.shipping_reference_number && (
                    <div className="mt-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Referans No:</span> {order!.shipping_reference_number}
                      </p>
                    </div>
                  )}
                  <PrintBarcodeButton
                    orderId={order!.id}
                    hasTrackingNumber={!!order!.shipping_tracking_number}
                    hasReferenceNumber={!!order!.shipping_reference_number}
                    order={order}
                  />
                  <PrintCollectionLabelButton
                    orderId={order!.id}
                    order={order}
                  />
                  {/* Yurtiçi Takip mini blok */}
                  {order!.shipping_carrier === 'yurtici' && (order as any)._yurticiTracking && (
                    <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <h5 className="text-xs font-semibold text-gray-600 mb-1">Yurtiçi Takip</h5>
                      {(() => {
                        const tracking: any = (order as any)._yurticiTracking;
                        const statusName =
                          tracking?.statusInfo?.name || tracking?.statusCode || 'Bilinmiyor';
                        const message = tracking?.message || '';
                        const hasProblem = !!tracking?.hasProblemReason;
                        const events: any[] = Array.isArray(tracking?.events)
                          ? tracking.events
                          : [];
                        const lastEvent = events.length > 0 ? events[events.length - 1] : null;

                        return (
                          <div className="space-y-1 text-xs text-gray-800">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                {statusName}
                              </span>
                              {hasProblem && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 border border-red-200">
                                  Sorunlu
                                </span>
                              )}
                            </div>
                            {message && (
                              <p className="text-[11px] text-gray-700">
                                {message}
                              </p>
                            )}
                            {lastEvent && (
                              <p className="text-[11px] text-gray-700">
                                <span className="font-semibold">{lastEvent.eventName || 'Son durum'}</span>
                                {': '}
                                {lastEvent.eventDate && (
                                  <span>
                                    {lastEvent.eventDate}
                                    {lastEvent.eventTime ? ` ${lastEvent.eventTime}` : ''}
                                  </span>
                                )}
                                {(lastEvent.unitName || lastEvent.cityName || lastEvent.townName) && (
                                  <span>
                                    {' • '}
                                    {lastEvent.unitName && `${lastEvent.unitName} `}
                                    {(lastEvent.cityName || lastEvent.townName) && (
                                      <span>
                                        ({lastEvent.cityName || ''}{lastEvent.cityName && lastEvent.townName ? ' / ' : ''}{lastEvent.townName || ''})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Ödeme Yöntemi</h3>
              <div className="space-y-2">
                <p className="text-gray-900">{getPaymentMethodLabel(order!.payment_method)}</p>
                {(() => {
                  const paymentBadge = getPaymentStatusBadge(
                    order!.payment_method,
                    order!.payment_status || null,
                    order!.status
                  );
                  return (
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${paymentBadge.className}`}>
                      {paymentBadge.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* COD Tahsilat Tipi - sadece COD siparişlerde göster */}
            {(order!.payment_method === 'kapida' || order!.payment_method === 'cod') && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Tahsilat Tipi</h3>
                  <CODPaymentTypeEditor
                    orderId={order!.id}
                    initialPaymentType={order!.shipping_payment_type as "cash" | "card" | null}
                  />
                </div>

                {/* Yurtiçi COD durumu ve debug alanları */}
                <div className="md:col-span-2 mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Yurtiçi COD Durumu</h3>
                  <p className="text-sm text-gray-800 mb-2">
                    <span className="font-semibold">Yurtiçi:</span>{' '}
                    {order!.yurtici_cod_confirmed
                      ? 'Tahsilatlı ✅'
                      : 'Normal ❌'}
                  </p>

                  {(order!.yurtici_cod_doc_id || order!.yurtici_cod_doc_type) && (
                    <p className="text-sm text-gray-800 mb-2">
                      <span className="font-semibold">COD Doc:</span>{' '}
                      {order!.yurtici_cod_doc_type || 'N/A'}{' '}
                      {order!.yurtici_cod_doc_id ? `(${order!.yurtici_cod_doc_id})` : ''}
                    </p>
                  )}

                  {order!.yurtici_report_document_types && order!.yurtici_report_document_types.length > 0 && (
                    <details className="mt-2 text-xs text-gray-700">
                      <summary className="cursor-pointer font-semibold">
                        Report document types (debug)
                      </summary>
                      <div className="mt-1">
                        {order!.yurtici_report_document_types.join(', ')}
                      </div>
                    </details>
                  )}

                  {reportDocsSummary && reportDocsSummary.length > 0 && (
                    <details className="mt-2 text-xs text-gray-700">
                      <summary className="cursor-pointer font-semibold">
                        Report documents (debug, max 20)
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all">
                        {JSON.stringify(reportDocsSummary.slice(0, 20), null, 2)}
                      </pre>
                    </details>
                  )}

                  <details className="mt-2 text-xs text-gray-700">
                    <summary className="cursor-pointer font-semibold">
                      Gönderilen COD alanları (debug)
                    </summary>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold">ttCollectionType:</span>{' '}
                        {order!.yurtici_tt_collection_type ?? 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">ttDocumentId:</span>{' '}
                        {order!.yurtici_tt_document_id ?? 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">ttInvoiceAmount:</span>{' '}
                        {order!.yurtici_tt_invoice_amount != null
                          ? `${order!.yurtici_tt_invoice_amount} ₺`
                          : 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">ttDocumentSaveType:</span>{' '}
                        {order!.yurtici_tt_document_save_type ?? 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">dcCreditRule:</span>{' '}
                        {order!.yurtici_dc_credit_rule ?? 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">dcSelectedCredit:</span>{' '}
                        {order!.yurtici_dc_selected_credit ?? 'N/A'}
                      </div>
                    </div>
                  </details>
                </div>
              </>
            )}

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
