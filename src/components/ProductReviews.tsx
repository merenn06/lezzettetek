'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductReview, ReviewStats } from '@/types/review';
import { addProductReview } from '@/lib/reviews/actions';
import AuthModal from './AuthModal';
import Toast from './Toast';

type ProductReviewsProps = {
  productId: string;
};

type SortOption = 'newest' | 'highest' | 'lowest';

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingOpenAfterAuth, setPendingOpenAfterAuth] = useState(false);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews?product_id=${productId}&limit=10`, {
          cache: 'no-store',
        });
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats || { average_rating: 0, total_reviews: 0 });
      } catch (err) {
        console.error('Yorumlar yüklenirken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const handleWriteReviewClick = () => {
    if (!isLoggedIn) {
      setPendingOpenAfterAuth(true);
      setShowAuthModal(true);
      return;
    }
    setShowReviewForm(true);
    // Focus textarea after form opens
    setTimeout(() => {
      const textarea = document.getElementById('review-comment') as HTMLTextAreaElement;
      textarea?.focus();
    }, 100);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    const result = await addProductReview(productId, rating, comment);

    if (!result.success) {
      const msg = result.error || 'Yorum eklenemedi';

      // Eğer backend "Giriş yapmanız gerekiyor" dönerse, AuthModal aç
      if (msg.toLowerCase().includes('giriş yapmanız gerekiyor')) {
        setPendingOpenAfterAuth(true);
        setShowAuthModal(true);
      }

      setToast({ message: msg, type: 'error' });
      return;
    }

    // Refresh reviews
    const res = await fetch(`/api/reviews?product_id=${productId}&limit=10`, {
      cache: 'no-store',
    });
    const data = await res.json();
    setReviews(data.reviews || []);
    setStats(data.stats || { average_rating: 0, total_reviews: 0 });

    // Close form and show success
    setShowReviewForm(false);
    setToast({ message: 'Yorumunuz eklendi', type: 'success' });

    // Refresh auth state
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Check auth state
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        const data = await res.json();
        setIsLoggedIn(!!data.user);
        if (data.user && pendingOpenAfterAuth) {
          setPendingOpenAfterAuth(false);
          setShowReviewForm(true);
          // Focus textarea after form opens
          setTimeout(() => {
            const textarea = document.getElementById('review-comment') as HTMLTextAreaElement;
            textarea?.focus();
          }, 100);
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  };

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'highest') {
      return b.rating - a.rating;
    } else {
      return a.rating - b.rating;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isVerifiedBuyer = (review: ProductReview) => {
    // Basit bir kontrol: eğer yorum 7 günden eskiyse "onaylı alıcı" sayılabilir
    // Veya daha gelişmiş bir sistem için orders tablosuna bakılabilir
    // Şimdilik basit bir mantık: yorum 7+ gün önce yapıldıysa onaylı
    const reviewDate = new Date(review.created_at);
    const daysSinceReview = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview >= 7;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <>
      <Toast
        message={toast?.message || ''}
        type={toast?.type || 'success'}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
      <div className="mt-12 rounded-2xl bg-white shadow-lg p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Yorumlar</h2>
            {stats.total_reviews > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(stats.average_rating))}
                </div>
                <span className="text-gray-600">
                  <span className="font-semibold">{stats.average_rating.toFixed(1)}</span>
                  <span className="text-sm"> ({stats.total_reviews} yorum)</span>
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleWriteReviewClick}
            className="px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md self-start md:self-auto"
          >
            Yorum Yaz
          </button>
        </div>

        {showReviewForm && isLoggedIn && (
          <ReviewForm
            onSubmit={handleReviewSubmit}
            onCancel={() => setShowReviewForm(false)}
          />
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Yorumlar yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4 font-medium">Henüz yorum yapılmamış</p>
            <p className="text-sm text-gray-500 mb-6">İlk yorumu siz yazın ve diğer müşterilere yardımcı olun!</p>
            <button
              type="button"
              onClick={handleWriteReviewClick}
              className="px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
            >
              Yorum Yaz
            </button>
          </div>
        ) : (
          <>
            {/* Sort Filter */}
            <div className="mb-6 flex items-center gap-3">
              <label htmlFor="sort-reviews" className="text-sm font-medium text-gray-700">
                Sırala:
              </label>
              <select
                id="sort-reviews"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
              >
                <option value="newest">En Yeni</option>
                <option value="highest">En Yüksek Puan</option>
                <option value="lowest">En Düşük Puan</option>
              </select>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
              {sortedReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{review.reviewer_name || 'Kullanıcı'}</h3>
                        {isVerifiedBuyer(review) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Onaylı Alıcı
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingOpenAfterAuth(false);
          }}
          onAuthSuccess={handleAuthSuccess}
          initialTab="login"
        />
      )}
    </>
  );
}

// Review Form Component
function ReviewForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (rating: number, comment: string) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when form opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Lütfen bir puan seçin.');
      return;
    }

    if (comment.length < 10) {
      setError('Yorum en az 10 karakter olmalıdır.');
      return;
    }

    if (comment.length > 1000) {
      setError('Yorum en fazla 1000 karakter olabilir.');
      return;
    }

    setIsSubmitting(true);
    await onSubmit(rating, comment);
    setIsSubmitting(false);
    setRating(0);
    setComment('');
  };

  const renderStarButtons = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (hoverRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          <svg
            className={`w-8 h-8 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      );
    });
  };

  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Yorumunuzu Yazın</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Puanınız
          </label>
          <div className="flex items-center gap-2">
            {renderStarButtons()}
            {rating > 0 && (
              <span className="text-sm text-gray-600 ml-2">{rating} / 5</span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-700 mb-2">
            Yorumunuz
          </label>
          <textarea
            ref={textareaRef}
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            minLength={10}
            maxLength={1000}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder="Ürün hakkındaki düşüncelerinizi paylaşın (en az 10 karakter)"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length} / 1000 karakter
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || comment.length < 10}
            className="px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
