export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  image_url?: string | null;
  created_at: string;
  // Joined from profiles
  reviewer_name?: string;
  reviewer_email?: string;
};

export type ReviewStats = {
  average_rating: number;
  total_reviews: number;
};
