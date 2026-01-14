'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types/product';
import { useCart } from '@/contexts/CartContext';
import { useFlyToCart } from '@/contexts/FlyToCartContext';

const CATEGORY_LABELS: Record<string, string> = {
  kavanoz: 'Kavanoz Ürünler',
  dondurulmus: 'Dondurulmuş',
  atistirmalik: 'Atıştırmalıklar',
};

const CATEGORY_STYLES: Record<string, { gradient: string; iconColor: string }> = {
  kavanoz: { gradient: 'from-amber-200 to-amber-300', iconColor: 'text-amber-700' },
  dondurulmus: { gradient: 'from-blue-200 to-blue-300', iconColor: 'text-blue-700' },
  atistirmalik: { gradient: 'from-orange-200 to-orange-300', iconColor: 'text-orange-700' },
  default: { gradient: 'from-green-200 to-green-300', iconColor: 'text-green-700' },
};

export default function UrunlerimizClient() {
  const { addItem } = useCart();
  const { triggerAnimation } = useFlyToCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Ürünler yüklenemedi');
        }
        const data = await response.json();
        setProducts(Array.isArray(data?.products) ? (data.products as Product[]) : []);
      } catch (err) {
        console.error('Ürünleri çekerken hata:', err);
        setError('Ürünleri alırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = useMemo(
    () => [
      { id: 'all', label: 'Tümü' },
    ],
    []
  );

  const filteredProducts = products;

  const getProductStyle = () => CATEGORY_STYLES.default;

  const formatPrice = (price: number) =>
    price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="w-full bg-white">
      <section className="py-24 px-4 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Ürünlerimiz
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Doğanın en taze ve kaliteli ürünlerini sofralarınıza getiriyoruz. 
            Her ürünümüz, özenle seçilmiş içeriklerle hazırlanır ve doğal lezzetini korur.
          </p>

          {/* Sabit kampanya banner + /kampanyalar linki */}
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-5xl">
              <Link href="/kampanyalar" className="block group">
                <div className="relative w-full">
                  {/* Masaüstü Banner */}
                  <div className="hidden md:block">
                    <Image
                      src="/masaustu-kampanya-banner.webp"
                      alt="Kampanya bannerı"
                      width={1600}
                      height={500}
                      className="w-full h-auto rounded-2xl shadow-lg object-cover"
                      priority
                    />
                  </div>
                  {/* Mobil Banner */}
                  <div className="block md:hidden">
                    <Image
                      src="/mobil-kampanya-banner.webp"
                      alt="Kampanya bannerı - mobil"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-2xl shadow-lg object-cover"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-1">
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1">
                    Kampanyalar
                  </span>
                  <span className="inline-flex items-center text-sm font-semibold text-green-700 group-hover:text-green-800">
                    Detayları gör
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Bar */}
      <section className="py-8 px-4 bg-white border-b border-gray-100">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  activeCategory === category.id
                    ? 'bg-green-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto">
          {loading && (
            <div className="text-center py-16 text-gray-600">
              Ürünler yükleniyor...
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-16 text-red-600 font-semibold">
              {error}
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              Bu kategoride ürün bulunamadı.
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const style = getProductStyle();
                const hasPrice = typeof product.price === 'number';

                return (
                  <div
                    key={product.id}
                    className="bg-gray-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex-col flex"
                  >
                    {/* Clickable Product Content */}
                    <Link
                      href={`/urunlerimiz/${product.slug}`}
                      className="flex flex-col flex-1 cursor-pointer"
                    >
                      {/* Product Image */}
                      <div className={`aspect-square bg-gradient-to-br ${style.gradient} flex items-center justify-center relative overflow-hidden`}>
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <svg className={`w-24 h-24 ${style.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 flex-1">
                        <h3 className="text-lg font-semibold mb-1.5 text-gray-900">
                          {product.name}
                        </h3>
                        {hasPrice && (
                          <p className="text-emerald-700 font-semibold text-base mt-1 mb-2">
                            {formatPrice(product.price)} ₺
                          </p>
                        )}
                        <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                    </Link>

                    {/* Add to Cart Button - Outside Link */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          const buttonRect = e.currentTarget.getBoundingClientRect();
                          const startX = buttonRect.left + buttonRect.width / 2;
                          const startY = buttonRect.top + buttonRect.height / 2;

                          try {
                            triggerAnimation(startX, startY);
                          } catch (animationError) {
                            console.warn('Animation error:', animationError);
                          }

                          addItem(product);
                        }}
                        className="w-full py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
                      >
                        Sepete Ekle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

