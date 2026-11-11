import { isRetailStoreProduct } from "@/lib/products/retail-store";
import {
  escapeXml,
  formatGooglePriceTry,
  normalizeSiteUrl,
  toAbsoluteUrl,
  truncateForFeed,
} from "@/lib/google-feed/xml";

/** Supabase `products` seçimi — canlı şemada olan alanlar (content yok). */
export const GOOGLE_FEED_PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  price,
  image_url,
  image_url_2,
  stock,
  sales_channel,
  category:categories (
    name
  )
`;

export type GoogleFeedProductRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  image_url_2?: string | null;
  stock?: number | null;
  sales_channel?: string | null;
  category?: { name?: string | null } | null;
};

export type GoogleFeedExclusion = {
  slug: string;
  productId?: string;
  reason:
    | "not_retail_store"
    | "missing_slug"
    | "invalid_price"
    | "missing_image"
    | "missing_title";
};

export type GoogleFeedBuildResult = {
  xml: string;
  includedCount: number;
  excluded: GoogleFeedExclusion[];
  channelTitle: string;
  baseUrl: string;
};

const DEFAULT_DESCRIPTION = "Tek Lezzet doğal ürünler.";

const parsePrice = (value: GoogleFeedProductRow["price"]): number | null => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

const resolvePrimaryImage = (
  product: GoogleFeedProductRow,
  baseUrl: string
): string | null => {
  const primary = product.image_url?.trim();
  if (primary) return toAbsoluteUrl(primary, baseUrl);
  const secondary = product.image_url_2?.trim();
  if (secondary) return toAbsoluteUrl(secondary, baseUrl);
  return null;
};

const resolveAdditionalImage = (
  product: GoogleFeedProductRow,
  baseUrl: string,
  primaryAbsolute: string
): string | null => {
  const primary = product.image_url?.trim();
  const secondary = product.image_url_2?.trim();
  if (!primary || !secondary) return null;
  const absolute = toAbsoluteUrl(secondary, baseUrl);
  return absolute === primaryAbsolute ? null : absolute;
};

const resolveAvailability = (stock: GoogleFeedProductRow["stock"]) => {
  if (typeof stock !== "number" || !Number.isFinite(stock)) {
    return "out_of_stock" as const;
  }
  return stock > 0 ? ("in_stock" as const) : ("out_of_stock" as const);
};

export function buildGoogleShoppingFeed(
  products: GoogleFeedProductRow[],
  siteUrl: string,
  channelTitle = "Tek Lezzet"
): GoogleFeedBuildResult {
  const baseUrl = normalizeSiteUrl(siteUrl);
  const excluded: GoogleFeedExclusion[] = [];
  const items: string[] = [];

  for (const product of products) {
    const slug = product.slug?.trim() ?? "";
    const productId = product.id;

    const channel = product.sales_channel === "campaign_995" ? "campaign_995" : "retail";
    if (!isRetailStoreProduct({ sales_channel: channel, slug })) {
      excluded.push({ slug: slug || String(productId), productId, reason: "not_retail_store" });
      continue;
    }

    if (!slug) {
      excluded.push({ slug: "(boş)", productId, reason: "missing_slug" });
      continue;
    }

    const titleRaw = product.name?.trim();
    if (!titleRaw) {
      excluded.push({ slug, productId, reason: "missing_title" });
      continue;
    }

    const price = parsePrice(product.price);
    if (price === null) {
      excluded.push({ slug, productId, reason: "invalid_price" });
      continue;
    }

    const imageLink = resolvePrimaryImage(product, baseUrl);
    if (!imageLink) {
      excluded.push({ slug, productId, reason: "missing_image" });
      continue;
    }

    const description = truncateForFeed(
      product.description?.trim() || DEFAULT_DESCRIPTION,
      5000
    );
    const title = truncateForFeed(titleRaw, 150);
    const link = toAbsoluteUrl(`/urunlerimiz/${slug}`, baseUrl);
    const availability = resolveAvailability(product.stock);
    const productType = product.category?.name?.trim();
    const additionalImage = resolveAdditionalImage(product, baseUrl, imageLink);

    const optionalTags = [
      productType
        ? `<g:product_type>${escapeXml(productType)}</g:product_type>`
        : "",
      additionalImage
        ? `<g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>`
        : "",
    ]
      .filter(Boolean)
      .join("\n      ");

    items.push(`
    <item>
      <g:id>${escapeXml(String(productId))}</g:id>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${formatGooglePriceTry(price)}</g:price>
      <g:brand>Tek Lezzet</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>false</g:identifier_exists>${optionalTags ? `\n      ${optionalTags}` : ""}
    </item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Tek Lezzet perakende ürün feed</description>${items.join("")}
  </channel>
</rss>`;

  return {
    xml,
    includedCount: items.length,
    excluded,
    channelTitle,
    baseUrl,
  };
}
