'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCart } from '@/contexts/CartContext';
import { useFlyToCart } from '@/contexts/FlyToCartContext';

const CATEGORY_STYLES: Record<string, { badge: string; gradient: string }> = {
  kavanoz: { badge: 'bg-green-100 text-green-700', gradient: 'from-green-200 to-green-300' },
  dondurulmus: { badge: 'bg-blue-100 text-blue-700', gradient: 'from-blue-200 to-blue-300' },
  atistirmalik: { badge: 'bg-amber-100 text-amber-700', gradient: 'from-amber-200 to-orange-300' },
  default: { badge: 'bg-gray-100 text-gray-700', gradient: 'from-green-200 to-green-300' },
};

export default function ProductDetailPage() {
  const params = useParams();
  const slug = useMemo(() => params?.slug as string | undefined, [params]);

  const { addItem } = useCart();
  const { triggerAnimation } = useFlyToCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/products/${slug}`, { cache: 'no-store' });
        if (response.status === 404) {
          setError('Ürün bulunamadı.');
          setProduct(null);
          return;
        }
        if (!response.ok) {
          throw new Error('Ürün bilgisi alınamadı');
        }
        const data = await response.json();
        setProduct(data?.product ?? null);
      } catch (err) {
        console.error('Ürün detayını çekerken hata:', err);
        setError('Ürün bilgisi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const getCategoryBadgeStyle = (category?: string | null) => {
    if (!category) return CATEGORY_STYLES.default.badge;
    return CATEGORY_STYLES[category]?.badge ?? CATEGORY_STYLES.default.badge;
  };

  const getProductGradient = (category?: string | null) => {
    if (!category) return CATEGORY_STYLES.default.gradient;
    return CATEGORY_STYLES[category]?.gradient ?? CATEGORY_STYLES.default.gradient;
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product) return;

    const buttonRect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;

    try {
      triggerAnimation(startX, startY);
    } catch (animationError) {
      console.warn('Animation error:', animationError);
    }

    addItem(product);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          Ürün bilgisi yükleniyor...
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-gray-700 mb-6">{error ?? 'Ürün bulunamadı.'}</p>
          <Link
            href="/urunlerimiz"
            className="inline-flex items-center text-green-700 hover:text-green-800 transition-colors font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürün listesine dön
          </Link>
        </div>
      </main>
    );
  }

  const hasPrice = typeof product.price === 'number';

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/urunlerimiz"
            className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürünlerimize Dön
          </Link>
        </div>

        {/* Product Detail Card */}
        <div className="rounded-2xl bg-white shadow-lg p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column: Product Image */}
            <div className="flex items-center justify-center">
              <div className="w-full aspect-square bg-gradient-to-br from-green-200 to-green-400 rounded-xl shadow-md flex items-center justify-center overflow-hidden relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <p className="text-white text-sm font-medium opacity-90">
                    Ürün görseli eklenmedi
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Product Info */}
            <div className="flex flex-col">

              {/* Product Title */}
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
                {product.name}
              </h1>

              {/* Price */}
              {hasPrice && (
                <div className="mb-4">
                  <span className="text-4xl font-bold text-green-700">
                    {formatPrice(product.price)} ₺
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                {product.description}
              </p>

              {/* Call-to-Action Buttons */}
              <div className="mt-auto space-y-4">
                <button
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
                >
                  Sepete Ekle
                </button>
                <div className="flex gap-3">
                  <Link
                    href="/cart"
                    className="flex-1 py-3 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors text-center"
                  >
                    Sepeti Görüntüle
                  </Link>
                  <Link
                    href="/checkout"
                    className="flex-1 py-3 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors text-center"
                  >
                    Alışverişi Tamamla
                  </Link>
                </div>
                <Link
                  href="/tarifler"
                  className="block w-full py-4 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors text-center"
                >
                  Tariflerde Kullan
                </Link>
              </div>
            </div>
          </div>

          {/* Content Section */}
          {product.content && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ürün İçeriği</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {product.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

