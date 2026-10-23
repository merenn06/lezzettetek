import { supabase } from '@/lib/supabaseClient';
import { calculateCodFee, calculateShipping } from '@/lib/shipping';
import { calculateCouponDiscount, roundCurrency } from '@/lib/coupons';

export type OrderItemInput = {
  product_id: string; // UUID
  product_name: string;
  unit_price: number;
  quantity: number;
};

export type RawOrderLineInput = {
  product_id: string;
  quantity: number;
  product_name?: string;
  unit_price?: number;
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
  invoice_type?: 'individual' | 'corporate';
  invoice_company_name?: string | null;
  invoice_tax_number?: string | null;
  invoice_tax_office?: string | null;
  campaign_code?: string | null;
  discount_amount?: number | null;
};

/**
 * Resolves cart lines from the database — ignores client-supplied prices and names.
 */
export async function resolveOrderItemsFromDatabase(
  items: RawOrderLineInput[]
): Promise<OrderItemInput[]> {
  if (!supabase) {
    throw new Error('Supabase client başlatılamadı. Env değişkenlerini kontrol et.');
  }

  if (!items || items.length === 0) {
    throw new Error('Sipariş en az bir ürün içermelidir.');
  }

  const quantityByProductId = new Map<string, number>();

  for (const [index, item] of items.entries()) {
    const productId = String(item.product_id || '').trim();
    if (!productId) {
      throw new Error(`Geçersiz ürün satırı (index ${index}): product_id zorunlu.`);
    }

    const quantity = item.quantity;
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Geçersiz ürün satırı (index ${index}): quantity pozitif tam sayı olmalı.`
      );
    }

    quantityByProductId.set(
      productId,
      (quantityByProductId.get(productId) || 0) + quantity
    );
  }

  const productIds = [...quantityByProductId.keys()];

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active, sales_channel')
    .in('id', productIds);

  if (productsError) {
    console.error('[orders] product lookup failed:', productsError);
    throw new Error('Ürün bilgileri doğrulanırken bir hata oluştu.');
  }

  if (!products || products.length !== productIds.length) {
    throw new Error('Sepetinizde geçersiz veya satışta olmayan ürün bulunuyor.');
  }

  const productById = new Map(products.map((p) => [p.id, p]));

  const campaignProductIds = products
    .filter((p) => p.sales_channel === 'campaign_995')
    .map((p) => p.id);

  const campaignPackageByProductId = new Map<
    string,
    { price: number; is_active: boolean }
  >();

  if (campaignProductIds.length > 0) {
    const { data: campaignPackages, error: campaignPackagesError } = await supabase
      .from('campaign_995_packages')
      .select('product_id, price, is_active')
      .in('product_id', campaignProductIds);

    if (campaignPackagesError) {
      console.error('[orders] campaign package lookup failed:', campaignPackagesError);
      throw new Error('Kampanya ürün bilgileri doğrulanırken bir hata oluştu.');
    }

    for (const pkg of campaignPackages ?? []) {
      if (!pkg?.product_id) continue;
      campaignPackageByProductId.set(pkg.product_id, {
        price: Number(pkg.price),
        is_active: pkg.is_active !== false,
      });
    }
  }

  const resolved: OrderItemInput[] = [];

  for (const [productId, quantity] of quantityByProductId) {
    const product = productById.get(productId);
    if (!product) {
      throw new Error('Sepetinizde geçersiz veya satışta olmayan ürün bulunuyor.');
    }

    if (product.is_active === false) {
      throw new Error(`"${product.name}" şu anda satışta değil.`);
    }

    const salesChannel = product.sales_channel ?? 'retail';
    let unitPrice: number;

    if (salesChannel === 'campaign_995') {
      const campaignPackage = campaignPackageByProductId.get(productId);
      if (!campaignPackage || !campaignPackage.is_active) {
        throw new Error(`"${product.name}" kampanya paketi şu anda satışta değil.`);
      }

      unitPrice = campaignPackage.price;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`"${product.name}" için geçersiz kampanya fiyatı.`);
      }

      const catalogPrice = Number(product.price);
      if (
        Number.isFinite(catalogPrice) &&
        Math.abs(catalogPrice - unitPrice) > 0.01
      ) {
        console.warn('[orders] campaign price mismatch (using package price)', {
          productId,
          catalogPrice,
          packagePrice: unitPrice,
        });
      }
    } else if (salesChannel === 'retail') {
      unitPrice = Number(product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`"${product.name}" için geçersiz fiyat.`);
      }
    } else {
      throw new Error(`"${product.name}" bu kanaldan sipariş edilemez.`);
    }

    const stock = Number(product.stock);
    if (Number.isFinite(stock) && quantity > stock) {
      throw new Error(`"${product.name}" için yeterli stok yok (kalan: ${stock}).`);
    }

    resolved.push({
      product_id: productId,
      product_name: String(product.name),
      unit_price: unitPrice,
      quantity,
    });
  }

  return resolved;
}

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
  
  const isCOD = orderData.payment_method === 'kapida' || orderData.payment_method === 'cod';
  const codFee = calculateCodFee(isCOD);

  const baseTotal = subtotal + shippingFee;
  const couponResult = calculateCouponDiscount(baseTotal, orderData.campaign_code);
  const discountAmount = couponResult.discountAmount;

  // Total price includes shipping, minus discount, plus COD fee (if applicable)
  const total_price = roundCurrency(couponResult.totalAfterDiscount + codFee);

  // Insert order - write email to both email and customer_email for backward compatibility
  const customerEmail = orderData.email || null;
  // Set status based on payment method (order status - separate from payment_status)
  const orderStatus = orderData.payment_method === 'iyzico' ? 'pending_payment' : 'yeni';
  
  // Set payment_status based on payment method
  // COD (kapida or cod) -> awaiting_payment
  // Online (iyzico, havale) -> null (will be set when paid)
  
  const paymentStatus = isCOD ? 'awaiting_payment' : null;
  
  // Set shipping_payment_type for COD orders
  // Frontend'den gelen değeri kullan; yoksa COD için "card" varsayılanı
  let shippingPaymentType: "cash" | "card" | null = null;
  if (isCOD) {
    if (orderData.shipping_payment_type === "cash" || orderData.shipping_payment_type === "card") {
      shippingPaymentType = orderData.shipping_payment_type;
    } else {
      // Fallback: COD sipariş ama frontend değeri yok/bozuksa, kart varsayılanı kullan
      shippingPaymentType = "card";
    }
  }

  // Debug: log final values before inserting order
  console.log("[orders-insert]", {
    payment_method: orderData.payment_method,
    orderData_shipping_payment_type: orderData.shipping_payment_type ?? null,
    computed_shippingPaymentType: shippingPaymentType,
  });
  
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
      campaign_code: couponResult.normalizedCoupon,
      discount_amount: discountAmount,
      invoice_type: orderData.invoice_type || 'individual',
      invoice_company_name: orderData.invoice_company_name || null,
      invoice_tax_number: orderData.invoice_tax_number || null,
      invoice_tax_office: orderData.invoice_tax_office || null,
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


