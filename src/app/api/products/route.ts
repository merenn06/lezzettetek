// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

// Ortam değişkeni yoksa erkenden patlayalım:
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase env değişkenleri eksik!");
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

    // products tablosunu çekiyoruz
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, products: data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /products hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase client başlatılamadı. Env değişkenlerini kontrol et." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, slug, price, stock, description, content, image_url, image_url_2, unit_price_text, compare_at_price } = body;

    // Validation
    if (!name || !slug || typeof price !== "number" || typeof stock !== "number" || !description) {
      return NextResponse.json(
        { success: false, error: "Eksik veya hatalı ürün verisi" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: "Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        slug,
        price,
        compare_at_price: typeof compare_at_price === "number" ? compare_at_price : null,
        stock,
        description,
        content: content || null,
        image_url: image_url || null,
        image_url_2: image_url_2 || null,
        unit_price_text: unit_price_text?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      // Handle duplicate slug error from database
      if (error.code === '23505' && error.message.includes('slug')) {
        return NextResponse.json(
          { success: false, error: "Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, product: data },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("API /products POST hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
