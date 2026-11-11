import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RETAIL_SALES_CHANNEL } from "@/lib/products/retail-store";
import {
  buildGoogleShoppingFeed,
  GOOGLE_FEED_PRODUCT_SELECT,
  type GoogleFeedProductRow,
} from "@/lib/google-feed/build-google-shopping-feed";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://lezzettetek.com";

export async function GET() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[google-feed] Supabase env eksik (URL veya service role).");
    return NextResponse.json(
      { success: false, error: "Supabase yapılandırması eksik." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("products")
    .select(GOOGLE_FEED_PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("sales_channel", RETAIL_SALES_CHANNEL)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[google-feed] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as GoogleFeedProductRow[];
  const result = buildGoogleShoppingFeed(rows, siteUrl);

  if (result.excluded.length > 0) {
    const byReason = result.excluded.reduce<Record<string, number>>((acc, row) => {
      acc[row.reason] = (acc[row.reason] ?? 0) + 1;
      return acc;
    }, {});
    console.warn("[google-feed] Hariç tutulan ürünler:", {
      total: result.excluded.length,
      byReason,
      samples: result.excluded.slice(0, 10),
    });
  }

  console.info("[google-feed] Feed oluşturuldu.", {
    queriedActiveRetail: rows.length,
    included: result.includedCount,
    excluded: result.excluded.length,
    baseUrl: result.baseUrl,
  });

  return new NextResponse(result.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600",
    },
  });
}
