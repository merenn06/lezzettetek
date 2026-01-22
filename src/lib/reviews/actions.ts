'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProductReview, ReviewStats } from '@/types/review';

export async function getProductReviews(productId: string, limit: number = 10) {
  const supabase = await createSupabaseServerClient();

  // Fetch reviews
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getProductReviews] Error:', error);
    return { reviews: [], stats: { average_rating: 0, total_reviews: 0 } };
  }

  // Get stats
  const { data: statsData, error: statsError } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId);

  let stats: ReviewStats = { average_rating: 0, total_reviews: 0 };
  if (!statsError && statsData && statsData.length > 0) {
    const total = statsData.length;
    const sum = statsData.reduce((acc, r) => acc + r.rating, 0);
    stats = {
      average_rating: sum / total,
      total_reviews: total,
    };
  }

  // Fetch profiles for reviewer names
  const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
  const profilesMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    // Use public client for profiles (read-only, no auth needed for public profiles)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        if (profile.full_name) {
          profilesMap.set(profile.id, profile.full_name);
        }
      });
    }
  }

  // Format reviews with reviewer name
  const reviews: ProductReview[] = (data || []).map((review: any) => {
    const reviewerName = profilesMap.get(review.user_id) || 'Kullanıcı';

    return {
      id: review.id,
      product_id: review.product_id,
      user_id: review.user_id,
      rating: review.rating,
      comment: review.comment,
      image_url: review.image_url ?? null,
      created_at: review.created_at,
      reviewer_name: reviewerName,
    };
  });

  return { reviews, stats };
}

export async function addProductReview(
  productId: string,
  rating: number,
  comment: string,
  imageUrl?: string | null
) {
  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Giriş yapmanız gerekiyor.',
    };
  }

  // Check if user already reviewed this product
  const { data: existingReview } = await supabase
    .from('product_reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingReview) {
    return {
      success: false,
      error: 'Bu ürün için zaten bir yorumunuz var. Yorumunuzu düzenleyebilirsiniz.',
    };
  }

  // Insert review
  const { data, error } = await supabase
    .from('product_reviews')
    .insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment,
      image_url: imageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[addProductReview] Error:', error);
    return {
      success: false,
      error: error.message || 'Yorum eklenirken bir hata oluştu.',
    };
  }

  revalidatePath(`/urunlerimiz/[slug]`, 'page');
  return {
    success: true,
    review: data,
  };
}
