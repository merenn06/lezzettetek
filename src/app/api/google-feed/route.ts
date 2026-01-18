import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

type ProductRow = {
  id?: string | number | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  content?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  stock?: number | null;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeSiteUrl = (url: string) => url.replace(/\/+$/, "");

const toAbsoluteUrl = (url: string, base: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
};

const formatPrice = (value: ProductRow["price"]) => {
  const numeric = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `${safe.toFixed(2)} TRY`;
};

export async function GET() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: "Supabase env değişkenleri eksik." },
      { status: 500 }
    );
  }

  if (!siteUrl) {
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_SITE_URL env değişkeni eksik." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,content,price,image_url,stock")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[google-feed] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const baseUrl = normalizeSiteUrl(siteUrl);
  const items = (data as ProductRow[] | null)
    ?.map((product) => {
      const id = product.id ? String(product.id) : "";
      const title = product.name?.trim() || "Lezzette Tek Ürün";
      const description =
        product.description?.trim() ||
        product.content?.trim() ||
        "Lezzette Tek doğal ve taze ürün";
      const slug = product.slug?.trim() || "";
      const link = toAbsoluteUrl(`/urunlerimiz/${slug}`, baseUrl);

      const imageUrl = product.image_url?.trim();
      const imageLink = imageUrl
        ? toAbsoluteUrl(imageUrl, baseUrl)
        : toAbsoluteUrl("/icon.png", baseUrl);

      const hasStockInfo = typeof product.stock === "number";
      const stockValue = product.stock;
      const availability =
        !hasStockInfo || (typeof stockValue === "number" && stockValue > 0)
          ? "in_stock"
          : "out_of_stock";

      return `
    <item>
      <g:id>${escapeXml(id || slug || title)}</g:id>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${formatPrice(product.price)}</g:price>
      <g:brand>Tek Lezzet</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
    })
    .join("") ?? "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Lezzette Tek</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Ürün feed</description>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600",
    },
  });
}
