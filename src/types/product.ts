export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  description: string;
  image_url: string;
  // Optional fields that may exist in Supabase but are not mandatory for UI
  created_at?: string;
  updated_at?: string;
};

