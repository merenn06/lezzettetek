import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(
  _request: Request,
  context: any
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase client başlatılamadı. Env değişkenlerini kontrol et." },
        { status: 500 }
      );
    }

    const resolvedParams = "then" in context.params ? await context.params : context.params;
    const { slug } = resolvedParams;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
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
    console.error("API /products/[slug] hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

