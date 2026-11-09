export type ProductCategory = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  description: string;
  image_url: string;
  image_url_2?: string | null;
  unit_price_text?: string | null;
  content?: string | null;
  origin?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  is_wholesale?: boolean;
  sales_channel?: 'retail' | 'campaign_995';
  category_id?: string | null;
  /** Supabase join: categories */
  category?: ProductCategory | null;
};
