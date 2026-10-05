import type { Product } from '@/types/product';

export type Campaign995SectionId = 'reklam' | 'tursu' | 'klasik' | 'ozel';

export type Campaign995CardStyle = 'standard' | 'full_art';

/** Supabase campaign_995_packages + joined product (checkout SKU) */
export type Campaign995PackageRow = {
  id: string;
  slug: string;
  name: string;
  pack_quantity: number;
  quantity_label: string;
  price: number;
  image_url: string | null;
  description: string | null;
  section: Campaign995SectionId;
  card_style: Campaign995CardStyle;
  product_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  product: Product | null;
};

/** UI / kart bileşeni */
export type Campaign995PackageView = {
  id: string;
  slug: string;
  name: string;
  packQuantity: number;
  quantityLabel: string;
  price: number;
  image: string | null;
  section: Campaign995SectionId;
  cardStyle: Campaign995CardStyle;
  cartProduct: Product;
};
