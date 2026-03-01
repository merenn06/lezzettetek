import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase env değişkenleri eksik! (wholesale-products)");
}

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase client başlatılamadı. NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY (veya NEXT_PUBLIC_SUPABASE_ANON_KEY) kontrol edin.",
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("wholesale_products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase wholesale_products error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, products: data ?? [] },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /wholesale-products hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

