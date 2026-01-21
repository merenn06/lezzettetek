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
  // Optional fields that may exist in Supabase but are not mandatory for UI
  created_at?: string;
  updated_at?: string;
};

