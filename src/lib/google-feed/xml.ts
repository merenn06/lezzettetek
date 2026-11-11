export const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const normalizeSiteUrl = (url: string) => url.replace(/\/+$/, "");

/** Göreli yollar ve Supabase Storage tam URL'lerini canonical site ile birleştirir. */
export const toAbsoluteUrl = (url: string, base: string) => {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
};

export const formatGooglePriceTry = (value: number) => `${value.toFixed(2)} TRY`;

export const truncateForFeed = (value: string, maxLength: number) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
};
