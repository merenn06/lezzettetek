import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Supabase client başlatılamadı. NEXT_PUBLIC_SUPABASE_URL ve API anahtarını kontrol edin.',
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, name, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Supabase categories error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, categories: data ?? [] },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    console.error('API /categories hata:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
