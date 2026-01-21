import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase client başlatılamadı. Env değişkenlerini kontrol et." },
        { status: 500 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, product: data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /admin/products/[id] GET hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase client başlatılamadı. Env değişkenlerini kontrol et." },
        { status: 500 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { name, slug, price, stock, description, content, image_url, image_url_2, unit_price_text, compare_at_price } = body;

    // Validation
    if (!name || !slug || typeof price !== "number" || typeof stock !== "number" || !description) {
      return NextResponse.json(
        { success: false, error: "Eksik veya hatalı ürün verisi" },
        { status: 400 }
      );
    }

    // Check if slug already exists for a different product
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .maybeSingle();

    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: "Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
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

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, product: data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /admin/products/[id] PUT hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase client başlatılamadı. Env değişkenlerini kontrol et." },
        { status: 500 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /admin/products/[id] DELETE hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

