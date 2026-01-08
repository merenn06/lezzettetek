import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PATCH(
  request: Request,
  context: any
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase client başlatılamadı. Env değişkenlerini kontrol et.' },
        { status: 500 }
      );
    }

    const resolvedParams = 'then' in context.params ? await context.params : context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { shipping_payment_type } = body;

    // Validate shipping_payment_type
    if (shipping_payment_type !== 'cash' && shipping_payment_type !== 'card') {
      return NextResponse.json(
        { success: false, error: 'shipping_payment_type değeri "cash" veya "card" olmalıdır' },
        { status: 400 }
      );
    }

    // Update order shipping_payment_type
    const { data, error } = await supabase
      .from('orders')
      .update({ shipping_payment_type })
      .eq('id', id)
      .select('id, shipping_payment_type')
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      
      // Check if order not found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: { id: data.id, shipping_payment_type: data.shipping_payment_type } },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('API /admin/orders/[id]/shipping-payment-type PATCH hata:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}




