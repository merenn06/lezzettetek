'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Product, ProductCategory } from '@/types/product';
import { filterRetailStoreProducts } from '@/lib/products/retail-store';
import {
  parseCategoryFilterParam,
  productMatchesCategoryFilter,
  type CategoryFilterId,
} from '@/lib/products/product-category-filter';
import { getProductPromoBadge } from '@/lib/products/product-promo-badge';
import { useCart } from '@/contexts/CartContext';
import { useFlyToCart } from '@/contexts/FlyToCartContext';
import PartnersLogos from '@/components/PartnersLogos';
import ProductImageSlider from '@/components/ProductImageSlider';

const CATEGORY_STYLES = {
  gradient: 'from-green-200 to-green-300',
  iconColor: 'text-green-700',
};

export default function UrunlerimizClient() {
  const { addItem } = useCart();
  const { triggerAnimation } = useFlyToCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const categorySlugSet = useMemo(
    () => new Set(categories.map((category) => category.slug)),
    [categories]
  );

  const activeCategory: CategoryFilterId = useMemo(() => {
    const parsed = parseCategoryFilterParam(searchParams.get('kategori'));
    if (parsed === 'all') return 'all';
    return categorySlugSet.has(parsed) ? parsed : 'all';
  }, [searchParams, categorySlugSet]);

  const setActiveCategory = (id: CategoryFilterId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'all') {
      params.delete('kategori');
    } else {
      params.set('kategori', id);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ]);

        if (!productsRes.ok) {
          throw new Error('Ürünler yüklenemedi');
        }

        const productsData = await productsRes.json();
        const raw = Array.isArray(productsData?.products)
          ? (productsData.products as Product[])
          : [];
        setProducts(filterRetailStoreProducts(raw));

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          const list = Array.isArray(categoriesData?.categories)
            ? (categoriesData.categories as ProductCategory[])
            : [];
          setCategories(list);
        } else {
          console.warn('Kategoriler yüklenemedi; filtre çubuğu gösterilmeyecek.');
          setCategories([]);
        }
      } catch (err) {
        console.error('Ürünleri çekerken hata:', err);
        setError('Ürünleri alırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const filterTabs = useMemo(
    () => [{ slug: 'all', name: 'Tüm Ürünler' }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))],
    [categories]
  );

  const filteredProducts = useMemo(
    () => products.filter((product) => productMatchesCategoryFilter(product, activeCategory)),
    [products, activeCategory]
  );

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
          <div className="text-lg md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            <p className="font-semibold text-red-600 text-2xl md:text-3xl">
              Ev Yapımı Kavanoz Ürünler
            </p>

            <a
              href="https://www.trendyol.com/magaza/tek-lezzet-m-332261?channelId=1&sst=0&sk=1"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 text-base md:text-lg font-semibold text-gray-800 hover:underline transition duration-200"
            >
              <span className="inline-flex items-center">
                <img
                  src="/trendyol-seeklogo.webp"
                  alt="Trendyol logosu"
                  className="h-6 w-auto"
                />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span>Tek Lezzet Trendyol'da da satışta</span>
                <span className="text-xs md:text-sm text-gray-500 font-normal">
                  Resmi mağazamızı ziyaret edin →
                </span>
              </span>
            </a>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm md:text-base text-gray-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm">
                🚚 1–3 günde kargo
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm">
                🇹🇷 Yerli üretim
              </span>
            </div>
          </div>
        </div>
      </section>

      <PartnersLogos />

      <section className="py-6 px-4 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm/50">
        <div className="container mx-auto">
          <div
            className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible scrollbar-thin -mx-2 px-2 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Ürün kategorileri"
          >
            {filterTabs.map((category) => {
              const selected = activeCategory === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveCategory(category.slug)}
                  className={`shrink-0 whitespace-nowrap px-4 py-2.5 md:px-6 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${
                    selected
                      ? 'bg-green-700 text-white shadow-md ring-2 ring-green-700/30 ring-offset-1'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
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
                const promoBadge = getProductPromoBadge(product);
                const hasPrice = typeof product.price === 'number';
                const compareAt =
                  typeof product.compare_at_price === 'number' ? product.compare_at_price : null;
                const hasDiscount = hasPrice && compareAt != null && compareAt > product.price;
                return (
                  <div
                    key={product.id}
                    className={`bg-gray-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex-col flex ${
                      hasDiscount ? 'border-2 border-green-700 hover:shadow-lg' : ''
                    }`}
                  >
                    <Link
                      href={`/urunlerimiz/${product.slug}`}
                      className="flex flex-col flex-1 cursor-pointer"
                    >
                      <div
                        className={`aspect-square bg-gradient-to-br ${CATEGORY_STYLES.gradient} flex items-center justify-center relative overflow-hidden`}
                      >
                        {promoBadge && (
                          <span
                            className={`absolute left-3 top-3 z-10 rounded-full text-white text-xs md:text-sm font-extrabold px-3 py-1 shadow-md ${
                              promoBadge.label === '4 AL 3 ÖDE'
                                ? 'bg-amber-600'
                                : 'bg-green-700'
                            }`}
                          >
                            {promoBadge.label}
                          </span>
                        )}
                        {product.image_url || product.image_url_2 ? (
                          <ProductImageSlider
                            images={[product.image_url, product.image_url_2]}
                            alt={product.name}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="h-full w-full"
                          />
                        ) : (
                          <svg
                            className={`w-24 h-24 ${CATEGORY_STYLES.iconColor}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="p-4 flex-1">
                        <h3 className="text-lg font-semibold mb-1.5 text-gray-900">
                          {product.name}
                        </h3>
                        {product.origin && (
                          <p className="text-base text-gray-900 mb-1.5">
                            Menşei: {product.origin}
                          </p>
                        )}
                        {hasPrice && (
                          <div className="mt-1 mb-2">
                            {hasDiscount ? (
                              <div className="flex items-baseline gap-3">
                                <span className="relative inline-block text-red-600 text-base md:text-lg font-semibold">
                                  <span
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                    aria-hidden
                                  >
                                    <span className="absolute top-1/2 h-[3px] w-[50%] -translate-y-1/2 bg-red-600 rotate-45 rounded-full mx-auto" />
                                    <span className="absolute top-1/2 h-[3px] w-[50%] -translate-y-1/2 bg-red-600 -rotate-45 rounded-full mx-auto" />
                                  </span>
                                  {formatPrice(compareAt!)} ₺
                                </span>
                                <p className="text-emerald-700 font-bold text-xl">
                                  {formatPrice(product.price)} ₺
                                </p>
                              </div>
                            ) : (
                              <p className="text-emerald-700 font-bold text-lg">
                                {formatPrice(product.price)} ₺
                              </p>
                            )}
                          </div>
                        )}
                        {product.unit_price_text?.trim() && (
                          <p className="text-sm font-bold text-gray-700 mb-2">
                            Birim Fiyat: {product.unit_price_text.trim()}
                          </p>
                        )}
                        <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                    </Link>

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
