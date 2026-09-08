import type { ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import MetaPurchaseTracker, {
  type MetaPurchaseTrackerItem,
} from '@/components/analytics/MetaPurchaseTracker';

type ThankYouPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

type OrderPurchaseRow = {
  id: string;
  total_price: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
};

type OrderItemPurchaseRow = {
  product_id: string;
  quantity: number;
  unit_price: number | null;
};

function parseTotalPrice(value: number | string | null | undefined): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function shouldTrackPurchasePixel(order: OrderPurchaseRow | null): boolean {
  if (!order) return false;

  const status = order.status ?? '';
  if (status === 'iptal' || status === 'payment_failed') {
    return false;
  }

  const paymentMethod = order.payment_method ?? '';

  if (paymentMethod === 'iyzico') {
    return order.payment_status === 'paid';
  }

  if (paymentMethod === 'kapida' || paymentMethod === 'cod') {
    return true;
  }

  return false;
}

async function getOrderForPurchase(
  orderId: string
): Promise<OrderPurchaseRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('id, total_price, payment_method, payment_status, status')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getOrderItemsForPurchase(
  orderId: string
): Promise<MetaPurchaseTrackerItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price')
    .eq('order_id', orderId);

  if (error || !data) {
    return [];
  }

  return (data as OrderItemPurchaseRow[])
    .filter((item) => item.product_id && Number(item.quantity) > 0)
    .map((item) => ({
      productId: String(item.product_id),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price ?? 0),
    }));
}

export default async function TesekkurlerPage({
  searchParams,
}: ThankYouPageProps) {
  const params = await searchParams;
  const orderId = params?.orderId;

  let purchaseTracker: ReactNode = null;

  if (orderId) {
    const order = await getOrderForPurchase(orderId);

    if (shouldTrackPurchasePixel(order)) {
      const items = await getOrderItemsForPurchase(orderId);
      const totalPrice = parseTotalPrice(order?.total_price);

      if (items.length > 0 && totalPrice > 0) {
        purchaseTracker = (
          <MetaPurchaseTracker
            orderId={orderId}
            totalPrice={totalPrice}
            items={items}
          />
        );
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      {purchaseTracker}
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-green-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Teşekkürler!
            </h1>

            <p className="text-lg text-gray-600 mb-6">
              Siparişiniz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.
            </p>

            {orderId && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2">Sipariş Numaranız:</p>
                <p className="text-xl font-mono font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-lg inline-block">
                  {orderId}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/urunlerimiz"
                className="px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
              >
                Alışverişe Devam Et
              </Link>
              <Link
                href="/"
                className="px-8 py-4 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
