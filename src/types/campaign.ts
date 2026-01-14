export type Campaign = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  bullets: string[];
  image_url_desktop: string;
  image_url_mobile?: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
};

