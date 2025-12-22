import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (!supabaseClient) {
      return NextResponse.json(
        {
          success: false,
          stage: 'supabase-client',
          error: 'Supabase client başlatılamadı. Env değişkenlerini kontrol et.',
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseClient
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          stage: 'supabase-select',
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Supabase bağlantısı ve orders tablosu OK',
        sample: data || [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        stage: 'exception',
        error: err?.message ?? 'Bilinmeyen hata',
      },
      { status: 500 }
    );
  }
}


