import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getIyzipayClient, createCheckoutForm, formatIyzicoDate } from '@/lib/iyzico/client';
import type { IyzicoCheckoutFormRequest } from '@/lib/iyzico/types';

const sb = supabase!;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    console.log('[iyzico-initialize] Payment initialization request received');
    const body = await req.json();
    const orderId = body?.orderId;

    if (!orderId || typeof orderId !== 'string') {
      console.error('[iyzico-initialize] Invalid orderId:', orderId);
      return NextResponse.json(
        { ok: false, error: 'orderId gereklidir ve string olmalıdır.' },
        { status: 400 }
      );
    }

    console.log('[iyzico-initialize] Processing order:', orderId);

    if (!supabase) {
      console.error('[iyzico-initialize] Supabase bağlantısı kurulamadı');
      return NextResponse.json(
        { ok: false, error: 'Supabase bağlantısı kurulamadı.' },
        { status: 500 }
      );
    }

    console.log('[iyzico-initialize] Fetching order from database');
    const { data: order, error: orderError } = await sb
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[iyzico-initialize] Order fetch error:', orderError);
      return NextResponse.json(
        { ok: false, error: 'Sipariş bulunamadı.' },
        { status: 404 }
      );
    }

    console.log('[iyzico-initialize] Order found:', order.id, 'Total price:', order.total_price);

    const { data: orderItems, error: itemsError } = await sb
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('[iyzico-initialize] Order items fetch error:', itemsError);
      return NextResponse.json(
        { ok: false, error: 'Sipariş ürünleri bulunamadı.' },
        { status: 404 }
      );
    }

    console.log('[iyzico-initialize] Order items found:', orderItems.length);

    const SHIPPING_FEE = 39.9;
    const subtotal = Number(order.total_price || 0);
    const totalPrice = subtotal + SHIPPING_FEE;

    console.log('[iyzico-initialize] Price calculation - Subtotal:', subtotal, 'Shipping:', SHIPPING_FEE, 'Total:', totalPrice);

    // Build callback URL dynamically from request headers
    // For reverse proxy (prod): use x-forwarded-proto and x-forwarded-host
    // For local: use host header
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = req.headers.get('host');
    
    let origin: string;
    
    if (forwardedHost) {
      // Reverse proxy (production)
      const proto = forwardedProto || 'https';
      origin = `${proto}://${forwardedHost}`;
    } else if (host) {
      // Local development
      const proto = forwardedProto || 'http';
      origin = `${proto}://${host}`;
    } else {
      // Fallback to Next.js URL origin
      origin = req.nextUrl.origin;
    }
    
    const callbackUrl = `${origin}/api/payment/iyzico/callback?orderId=${order.id}`;
    
    console.log('[iyzico-initialize] Callback URL:', callbackUrl);

    const phoneRaw = String(order.phone || '').replace(/\D/g, '');
    const gsmNumber = phoneRaw
      ? (phoneRaw.startsWith('90') ? `+${phoneRaw}` : `+90${phoneRaw}`)
      : '+905350000000';

    const customerName = String(order.customer_name || 'Müşteri');
    const surname = customerName.split(' ').slice(-1)[0] || customerName;

    // Format dates for iyzico: YYYY-MM-DD HH:mm:ss
    const registrationDate = formatIyzicoDate(order.created_at || Date.now());
    const lastLoginDate = formatIyzicoDate(new Date());

    console.log('[iyzico-initialize] registrationDate formatted:', registrationDate);
    console.log('[iyzico-initialize] lastLoginDate formatted:', lastLoginDate);

    const buyer = {
      id: String(order.id).substring(0, 50),
      name: customerName,
      surname,
      gsmNumber,
      email: order.email || order.customer_email || `${order.id}@temp.local`,
      identityNumber: '11111111111',
      registrationAddress: order.address || '-',
      ip:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        '85.34.78.112',
      city: order.city || 'Istanbul',
      country: 'Turkey',
      zipCode: order.postal_code || '34000',
      registrationDate,
      lastLoginDate,
    };

    const shippingAddress = {
      contactName: customerName,
      city: order.city || 'Istanbul',
      country: 'Turkey',
      address: order.address || '-',
      zipCode: order.postal_code || '34000',
    };

    const billingAddress = {
      contactName: customerName,
      city: order.city || 'Istanbul',
      country: 'Turkey',
      address: order.address || '-',
      zipCode: order.postal_code || '34000',
    };

    const basketItems = orderItems.map((item: any) => ({
      id: String(item.product_id || item.id || 'item').substring(0, 50),
      name: item.product_name || 'Ürün',
      category1: 'Gıda',
      category2: 'Konserve',
      itemType: 'PHYSICAL',
      price: ((Number(item.unit_price || 0)) * (Number(item.quantity || 1))).toFixed(2),
    }));

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

    console.log('[iyzico-initialize] Creating iyzico client');
    const iyzipay = getIyzipayClient();

    const request: IyzicoCheckoutFormRequest = {
      locale: 'tr',
      conversationId: orderId, // orderId burada kalacak
      price: totalPrice.toFixed(2),
      paidPrice: totalPrice.toFixed(2),
      currency: 'TRY',
      basketId: orderId,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer,
      shippingAddress,
      billingAddress,
      basketItems,
    };

    console.log('[iyzico-initialize] Sending request to iyzico, basket items:', basketItems.length);
    console.log('[iyzico-initialize] Request details:', {
      locale: request.locale,
      conversationId: request.conversationId,
      price: request.price,
      paidPrice: request.paidPrice,
      currency: request.currency,
      basketId: request.basketId,
      callbackUrl: request.callbackUrl,
      buyerId: request.buyer.id,
      buyerEmail: request.buyer.email,
      basketItemsCount: request.basketItems.length,
    });
    const result = await createCheckoutForm(iyzipay, request);

    if (!result || result.status !== 'success') {
      const errorMessage = result?.errorMessage || 'Ödeme formu oluşturulamadı';
      const errorCode = result?.errorCode;
      
      // Check for credential mismatch error
      if (errorCode === '1001' || errorMessage.includes('api bilgileri bulunamadı')) {
        const baseUrl = (process.env.IYZI_BASE_URL || 'https://sandbox-api.iyzipay.com').trim();
        const isSandbox = baseUrl.includes('sandbox');
        
        console.error('[iyzico-initialize] ❌ API BİLGİLERİ BULUNADI HATASI!');
        console.error('[iyzico-initialize] Base URL:', baseUrl);
        console.error('[iyzico-initialize] Ortam:', isSandbox ? 'SANDBOX' : 'LIVE');
        console.error('[iyzico-initialize] ⚠️  UYARI: API key\'leriniz ortam ile uyumlu olmayabilir!');
        console.error('[iyzico-initialize] ⚠️  Sandbox ortamı kullanıyorsanız SANDBOX API key\'leri kullanmalısınız.');
        console.error('[iyzico-initialize] ⚠️  Live ortamı kullanıyorsanız PRODUCTION API key\'leri kullanmalısınız.');
        console.error('[iyzico-initialize] Full result:', JSON.stringify(result));
        
        return NextResponse.json(
          { 
            ok: false, 
            error: `API bilgileri bulunamadı. ${isSandbox ? 'Sandbox' : 'Live'} ortamı için doğru API key'lerini kullandığınızdan emin olun. İyzico panelinden API bilgilerinizi kontrol edin.`,
            errorCode,
            environment: isSandbox ? 'sandbox' : 'live',
            result 
          },
          { status: 500 }
        );
      }
      
      console.error('[iyzico-initialize] iyzico initialize failed:', errorMessage, 'Full result:', JSON.stringify(result));
      return NextResponse.json(
        { ok: false, error: errorMessage, result },
        { status: 500 }
      );
    }

    console.log('[iyzico-initialize] Payment form created successfully, token:', result.token?.substring(0, 20) + '...');
    return NextResponse.json(
      {
        ok: true,
        token: result.token,
        checkoutFormContent: result.checkoutFormContent,
        paymentPageUrl: result.paymentPageUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[iyzico-initialize] Initialize payment error:', error);
    const errorStack = error?.stack || undefined;
    console.error('[iyzico-initialize] Error stack:', errorStack);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Bilinmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
