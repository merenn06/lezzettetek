import { NextRequest, NextResponse } from 'next/server';
import Iyzipay from 'iyzipay';
import { supabase } from '@/lib/supabaseClient';

// Initialize iyzico client
function getIyzipayClient() {
  const apiKey = process.env.IYZI_API_KEY;
  const secretKey = process.env.IYZI_SECRET_KEY;
  const baseUrl = process.env.IYZI_BASE_URL || 'https://sandbox-api.iyzipay.com';

  if (!apiKey || !secretKey) {
    throw new Error('IYZI_API_KEY ve IYZI_SECRET_KEY env değişkenleri tanımlı olmalıdır.');
  }

  return new Iyzipay({
    apiKey,
    secretKey,
    uri: baseUrl,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'orderId gereklidir ve string olmalıdır.' },
        { status: 400 }
      );
    }

    // Get order from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { ok: false, error: 'Sipariş bulunamadı.' },
        { status: 404 }
      );
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('Order items fetch error:', itemsError);
      return NextResponse.json(
        { ok: false, error: 'Sipariş ürünleri bulunamadı.' },
        { status: 404 }
      );
    }

    // Calculate shipping fee (39.90 TL as per checkout page)
    const SHIPPING_FEE = 39.90;
    const subtotal = order.total_price || 0;
    const totalPrice = subtotal + SHIPPING_FEE;

    // Prepare iyzico request
    const iyzipay = getIyzipayClient();
    const callbackUrl = process.env.IYZI_CALLBACK_URL;

    if (!callbackUrl) {
      return NextResponse.json(
        { ok: false, error: 'IYZI_CALLBACK_URL env değişkeni tanımlı olmalıdır.' },
        { status: 500 }
      );
    }

    // Format phone number (remove spaces, dashes, etc.)
    const phoneNumber = order.phone.replace(/\D/g, '');

    // Prepare buyer info
    const buyer = {
      id: order.id.substring(0, 50), // iyzico max length
      name: order.customer_name,
      surname: order.customer_name.split(' ').slice(-1)[0] || order.customer_name,
      gsmNumber: phoneNumber.startsWith('90') ? `+${phoneNumber}` : `+90${phoneNumber}`,
      email: order.email || `${order.id}@temp.com`,
      identityNumber: '11111111111', // Required by iyzico, use dummy for now
      lastLoginDate: new Date().toISOString().split('T')[0],
      registrationDate: new Date(order.created_at).toISOString().split('T')[0],
      registrationAddress: order.address,
      ip: '85.34.78.112', // Can be extracted from request headers if needed
      city: order.city,
      country: 'Turkey',
      zipCode: order.postal_code || '34000',
    };

    // Prepare shipping address
    const shippingAddress = {
      contactName: order.customer_name,
      city: order.city,
      country: 'Turkey',
      address: order.address,
      zipCode: order.postal_code || '34000',
    };

    // Prepare billing address (same as shipping for now)
    const billingAddress = {
      contactName: order.customer_name,
      city: order.city,
      country: 'Turkey',
      address: order.address,
      zipCode: order.postal_code || '34000',
    };

    // Prepare basket items
    const basketItems = orderItems.map((item) => ({
      id: item.product_id.substring(0, 50),
      name: item.product_name || 'Ürün',
      category1: 'Gıda',
      category2: 'Konserve',
      itemType: 'PHYSICAL',
      price: ((item.unit_price || 0) * (item.quantity || 1)).toFixed(2),
    }));

    // Add shipping as a basket item
    if (SHIPPING_FEE > 0) {
      basketItems.push({
        id: 'shipping',
        name: 'Kargo Ücreti',
        category1: 'Hizmet',
        category2: 'Kargo',
        itemType: 'PHYSICAL',
        price: SHIPPING_FEE.toFixed(2),
      });
    }

    const request = {
      locale: 'tr',
      conversationId: orderId,
      price: totalPrice.toFixed(2),
      paidPrice: totalPrice.toFixed(2),
      currency: 'TRY',
      basketId: orderId,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: buyer,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      basketItems: basketItems,
    };

    // Note: iyzipay uses callbacks, so we need to wait for the response
    // This is a limitation of the iyzipay SDK. We'll use a promise wrapper.
    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
        if (err) {
          console.error('iyzico checkout form initialize error:', err);
          resolve(
            NextResponse.json(
              { ok: false, error: 'Ödeme formu oluşturulurken hata oluştu.' },
              { status: 500 }
            )
          );
          return;
        }

        if (result.status === 'success') {
          resolve(
            NextResponse.json({
              ok: true,
              token: result.token,
              checkoutFormContent: result.checkoutFormContent,
              paymentPageUrl: result.paymentPageUrl,
            })
          );
        } else {
          console.error('iyzico error:', result.errorMessage);
          resolve(
            NextResponse.json(
              { ok: false, error: result.errorMessage || 'Ödeme formu oluşturulamadı.' },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error: any) {
    console.error('Initialize payment error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Bilinmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}

