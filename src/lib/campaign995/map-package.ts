import type { Campaign995PackageRow, Campaign995PackageView } from '@/types/campaign995-package';
import type { Product } from '@/types/product';

function rowToProduct(row: Campaign995PackageRow): Product | null {
  const p = row.product;
  if (!p?.id) return null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price) || Number(row.price) || 995,
    stock: typeof p.stock === 'number' ? p.stock : 100,
    description: p.description ?? '995 TL kampanya paketi',
    image_url: p.image_url ?? row.image_url ?? '',
    image_url_2: null,
    unit_price_text: null,
    content: null,
    origin: null,
    is_active: p.is_active ?? true,
    sales_channel: p.sales_channel ?? 'campaign_995',
  };
}

export function mapCampaign995RowToView(row: Campaign995PackageRow): Campaign995PackageView | null {
  const cartProduct = rowToProduct(row);
  if (!cartProduct) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    packQuantity: row.pack_quantity,
    quantityLabel: row.quantity_label,
    price: Number(row.price) || 995,
    image: row.image_url,
    section: row.section,
    cardStyle: row.card_style,
    cartProduct,
  };
}
