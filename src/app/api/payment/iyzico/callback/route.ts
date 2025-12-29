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
    // iyzico callback body'den token al
    const body = await req.json();
    const token = body.token;

    if (!token || typeof token !== 'string') {
      console.error('Token bulunamadı veya geçersiz:', body);
      return NextResponse.json({ status: 'error', message: 'Token bulunamadı' }, { status: 400 });
    }

    // Retrieve checkout form result
    const iyzipay = getIyzipayClient();
    const request = {
      token: token,
    };

    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve(request, async (err: any, result: any) => {
        if (err) {
          console.error('iyzico retrieve error:', err);
          resolve(NextResponse.json({ status: 'error', message: 'Ödeme sorgulanamadı' }, { status: 500 }));
          return;
        }

        if (result.status !== 'success') {
          console.error('iyzico retrieve failed:', result.errorMessage);
          resolve(NextResponse.json({ status: 'error', message: result.errorMessage || 'Ödeme sorgulanamadı' }, { status: 500 }));
          return;
        }

        // Get payment status
        const paymentStatus = result.paymentStatus;
        const conversationId = result.conversationId; // This is our orderId

        if (!conversationId) {
          console.error('conversationId bulunamadı');
          resolve(NextResponse.json({ status: 'error', message: 'Sipariş ID bulunamadı' }, { status: 400 }));
          return;
        }

        // Update order in Supabase
        if (paymentStatus === 'SUCCESS') {
          // Payment successful
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              payment_provider: 'iyzico',
              payment_token: token,
              payment_status: 'success',
              paid_at: new Date().toISOString(),
              iyzico_payment_id: result.paymentId || null,
            })
            .eq('id', conversationId);

          if (updateError) {
            console.error('Order update error:', updateError);
            resolve(NextResponse.json({ status: 'error', message: 'Sipariş güncellenemedi' }, { status: 500 }));
            return;
          }

          console.log(`Order ${conversationId} payment successful`);
          resolve(NextResponse.json({ status: 'success', message: 'Ödeme başarılı' }, { status: 200 }));
        } else {
          // Payment failed
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'payment_failed',
              payment_provider: 'iyzico',
              payment_token: token,
              payment_status: 'failed',
              iyzico_payment_id: result.paymentId || null,
            })
            .eq('id', conversationId);

          if (updateError) {
            console.error('Order update error:', updateError);
            resolve(NextResponse.json({ status: 'error', message: 'Sipariş güncellenemedi' }, { status: 500 }));
            return;
          }

          console.log(`Order ${conversationId} payment failed: ${paymentStatus}`);
          resolve(NextResponse.json({ status: 'failed', message: 'Ödeme başarısız' }, { status: 200 }));
        }
      });
    });
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Bilinmeyen hata' }, { status: 500 });
  }
}

