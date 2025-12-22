import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendOrderStatusEmail } from '@/lib/mailer';

const ALLOWED_STATUSES = ['yeni', 'hazirlaniyor', 'kargoya_verildi', 'tamamlandi', 'iptal'] as const;

export async function PATCH(
  request: Request,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
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
    const { status } = body;

    // Validate status
    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Status değeri gerekli' },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { success: false, error: `Geçersiz status değeri: ${status}` },
        { status: 400 }
      );
    }

    // First, fetch order to get email and customer_name
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('id, email, customer_name')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!orderData) {
      return NextResponse.json(
        { success: false, error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    // Update order status
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select('id, status')
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

    // Send email notification if order has an email address
    if (orderData.email) {
      console.log('[status-mail] to:', orderData.email, 'orderId:', id, 'status:', data.status);
      try {
        await sendOrderStatusEmail({
          to: orderData.email,
          orderId: id,
          customerName: orderData.customer_name || 'Müşteri',
          status: data.status,
        });
      } catch (mailErr) {
        // Log email error but don't fail the status update
        console.error('[status-mail] failed:', mailErr);
      }
    } else {
      console.log('[status-mail] skipped: no email for order', id);
    }

    return NextResponse.json(
      { success: true, data: { id: data.id, status: data.status } },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('API /admin/orders/[id]/status PATCH hata:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
