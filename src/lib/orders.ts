import { supabase } from '@/lib/supabaseClient';

export type OrderItemInput = {
  product_id: string; // UUID
  product_name: string;
  unit_price: number;
  quantity: number;
};

export type CreateOrderInput = {
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  district: string;
  note?: string | null;
  payment_method: 'havale' | 'kapida';
};

export async function createOrderWithItems(
  orderData: CreateOrderInput,
  items: OrderItemInput[],
): Promise<{ orderId: string }> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı. Env değişkenlerini kontrol et.');
  }

  if (!items || items.length === 0) {
    throw new Error('Sipariş en az bir ürün içermelidir.');
  }

  // Calculate line totals and total price
  const orderItems = items.map((item) => {
    const lineTotal = item.unit_price * item.quantity;
    return {
      ...item,
      lineTotal,
    };
  });

  const total_price = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: orderData.customer_name,
      phone: orderData.phone,
      email: orderData.email || null,
      address: orderData.address,
      city: orderData.city,
      district: orderData.district,
      note: orderData.note || null,
      payment_method: orderData.payment_method,
      status: 'yeni',
      total_price: total_price,
    })
    .select('id')
    .single();

  if (orderError) {
    console.error('Supabase order insert error:', orderError);
    throw new Error(`Sipariş kaydedilirken hata oluştu: ${orderError.message}`);
  }

  if (!order || !order.id) {
    console.error('Order insert returned no data');
    throw new Error('Sipariş kaydedilirken hata oluştu: Sipariş ID alınamadı');
  }

  const orderId = order.id;

  // Insert order items
  const orderItemsPayload = orderItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    price: item.lineTotal, // lineTotal is stored in price column
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsError) {
    console.error('Supabase order_items insert error:', itemsError);
    // Best-effort cleanup: try to delete the order
    try {
      const { error: cleanupError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      if (cleanupError) {
        console.error('Order cleanup error:', cleanupError);
      }
    } catch (cleanupErr) {
      console.error('Unexpected error during order cleanup:', cleanupErr);
    }
    throw new Error(`Sipariş ürünleri kaydedilirken hata oluştu: ${itemsError.message}`);
  }

  return { orderId };
}


