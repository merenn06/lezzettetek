import { supabase } from '@/lib/supabaseClient';
import { calculateShipping } from '@/lib/shipping';

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
  payment_method: 'havale' | 'kapida' | 'iyzico' | 'cod';
  shipping_payment_type?: "cash" | "card" | null; // COD tahsilat tipi (nakit/kart)
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

  // Calculate line totals and subtotal
  const orderItems = items.map((item) => {
    const lineTotal = item.unit_price * item.quantity;
    return {
      ...item,
      lineTotal,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  // Calculate shipping fee on server side (don't trust frontend)
  const shippingFee = calculateShipping(subtotal);
  
  // Total price includes shipping
  const total_price = subtotal + shippingFee;

  // Insert order - write email to both email and customer_email for backward compatibility
  const customerEmail = orderData.email || null;
  // Set status based on payment method (order status - separate from payment_status)
  const orderStatus = orderData.payment_method === 'iyzico' ? 'pending_payment' : 'yeni';
  
  // Set payment_status based on payment method
  // COD (kapida or cod) -> awaiting_payment
  // Online (iyzico, havale) -> null (will be set when paid)
  const isCOD = orderData.payment_method === 'kapida' || orderData.payment_method === 'cod';
  const paymentStatus = isCOD ? 'awaiting_payment' : null;
  
  // Set shipping_payment_type for COD orders
  // Kontrat gereği her zaman "card" (kredi kartı) - nakit seçeneği kaldırıldı
  let shippingPaymentType: "cash" | "card" | null = null;
  if (isCOD) {
    // Always "card" - contract requires credit card collection only
    shippingPaymentType = "card";
  }
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: orderData.customer_name,
      phone: orderData.phone,
      email: customerEmail,
      customer_email: customerEmail, // Also write to customer_email for consistency
      address: orderData.address,
      city: orderData.city,
      district: orderData.district,
      note: orderData.note || null,
      payment_method: orderData.payment_method,
      status: orderStatus, // Order status (yeni, pending_payment, etc.)
      payment_status: paymentStatus, // Payment status (awaiting_payment, paid, etc.)
      shipping_payment_type: shippingPaymentType, // COD tahsilat tipi (kontrat gereği her zaman "card")
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


