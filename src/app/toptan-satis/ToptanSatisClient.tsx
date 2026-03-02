"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PartnersLogos from "@/components/PartnersLogos";
import type { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useFlyToCart } from "@/contexts/FlyToCartContext";

const STAND_SLIDES = [
  {
    src: "/stantttt/e9f3a51f-3f05-4093-bd31-db39a8739bb6.webp",
    alt: "Tek Lezzet ürünlerinin market standı üzerinde sergilenmesi",
  },
  {
    src: "/stantttt/WhatsApp Image 2026-02-24 at 12.51.03.webp",
    alt: "Tek Lezzet kavanoz ürünlerinin raf yerleşimi örneği",
  },
  {
    src: "/stantttt/WhatsApp Image 2026-02-24 at 12.58.21.webp",
    alt: "Tek Lezzet kavanoz ürünlerinin raf yerleşimi örneği",
  },
  {
    src: "/stantttt/WhatsApp Image 2026-02-24 at 13.02.48.webp",
    alt: "Tek Lezzet kavanoz ürünlerinin raf yerleşimi örneği",
  },
  {
    src: "/stantozkurus.webp",
    alt: "Tek Lezzet ürünlerinin Özkuruşlar market standında sergilenmesi",
  },
  {
    src: "/stantcar.webp",
    alt: "Tek Lezzet ürünlerinin Carrefour market standında sergilenmesi",
  },
  {
    src: "/stantyuvarlakcar.webp",
    alt: "Tek Lezzet ürünlerinin Carrefour yuvarlak standında sergilenmesi",
  },
];

export default function ToptanSatisClient() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isStandModalOpen, setIsStandModalOpen] = useState(false);

  const { addItem } = useCart();
  const { triggerAnimation } = useFlyToCart();

  const [wholesaleProducts, setWholesaleProducts] = useState<Product[]>([]);
  const [wholesaleLoading, setWholesaleLoading] = useState<boolean>(true);
  const [wholesaleError, setWholesaleError] = useState<string | null>(null);

  const whatsappMessage = useMemo(
    () =>
      "Merhaba, Tek Lezzet toptan satış için fiyat teklifi almak istiyorum. Firma adım: __ / Şehir: __ / Tahmini aylık alım: __.",
    []
  );

  const whatsappLink = useMemo(() => {
    const encoded = encodeURIComponent(whatsappMessage);
    return `https://wa.me/905532350634?text=${encoded}`;
  }, [whatsappMessage]);

  const formatPrice = (price: number) =>
    price.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusable = getFocusableElements(modalRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      modalRef.current?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusableElements(modalRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const isShift = event.shiftKey;

      if (isShift && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!isShift && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [isOpen]);

  // Autoplay for stand slider (5 saniye)
  useEffect(() => {
    if (STAND_SLIDES.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % STAND_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  // Stand slider zoom modal: ESC ve ok tuşları
  useEffect(() => {
    if (!isStandModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsStandModalOpen(false);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveSlide((prev) => (prev + 1) % STAND_SLIDES.length);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveSlide((prev) =>
          prev === 0 ? STAND_SLIDES.length - 1 : prev - 1
        );
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isStandModalOpen]);

  // 3'lü koli bazlı ürünler için listeyi yükle
  useEffect(() => {
    const fetchWholesaleProducts = async () => {
      try {
        const response = await fetch("/api/wholesale-products", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Ürünler yüklenemedi");
        }
        const data = await response.json();
        const rawProducts: any[] = Array.isArray(data?.products)
          ? (data.products as any[])
          : [];

        const mapped: Product[] = rawProducts.map((item) => {
          const name: string = item.name ?? "";
          const description: string = item.description ?? "";
          const image_url: string = item.image_url ?? "";
          const total_weight: string | null =
            typeof item.total_weight === "string" && item.total_weight.trim()
              ? item.total_weight.trim()
              : null;

          const unit_price_text = total_weight ?? null;

          const product: Product = {
            id: item.id,
            name,
            slug: item.slug,
            price: Number(item.price) || 0,
            compare_at_price: null,
            stock: 999999,
            description,
            image_url,
            image_url_2: null,
            unit_price_text,
            content: null,
            origin: null,
            created_at: item.created_at,
            updated_at: item.updated_at,
            is_wholesale: true,
          };

          return product;
        });

        setWholesaleProducts(mapped);
      } catch (error) {
        console.error("Toptan ürünleri çekerken hata:", error);
        setWholesaleError(
          "Toptan ürünler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
        );
      } finally {
        setWholesaleLoading(false);
      }
    };

    fetchWholesaleProducts();
  }, []);

  return (
    <main className="bg-white">
      <section className="bg-gradient-to-br from-green-50 to-amber-50 py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
            Kurumsal Tedarik
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            Tek Lezzet Firması Olarak Toptan Hizmet Verdiğimiz Müşteri Portföyleri
          </h1>

          <div className="mt-5 md:mt-6 md:flex md:items-center md:justify-between md:gap-10">
            <ol className="text-lg text-gray-700 leading-relaxed list-decimal pl-6 space-y-2 md:mt-0 md:flex-1">
              <li>Zincir Marketler ve Yerel Marketler</li>
              <li>Manavlar</li>
              <li>Restoranlar</li>
              <li>Oteller</li>
              <li>Şarküteriler</li>
              <li>Yemekhaneler ve Catering Firmaları</li>
              <li>Meyve ve Sebze Halleri</li>
              <li>Yurt Dışı İhracat</li>
            </ol>

            {/* Güven satırı - Trendyol */}
            <a
              href="https://www.trendyol.com/magaza/tek-lezzet-m-332261?channelId=1&sst=0&sk=1"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 md:mt-0 inline-flex flex-wrap items-center gap-3 text-sm text-gray-700 font-medium hover:underline transition duration-200 md:flex-1 md:max-w-xs md:self-center"
            >
              <span className="inline-flex items-center">
                <Image
                  src="/trendyol-seeklogo.webp"
                  alt="Trendyol logosu"
                  width={80}
                  height={20}
                  className="h-5 w-auto"
                />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span>Tek Lezzet, Trendyol'da da aktif satış yapmaktadır.</span>
                <span className="text-xs text-gray-500">
                  Resmi mağazamızı ziyaret edin →
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Lezzetlerimizi Tercih Eden İş Ortaklarımız - Logo Bölümü */}
      <div className="mt-10 md:mt-12">
        <PartnersLogos />
      </div>

      {/* Saha Uygulamaları & Market Standları Slider */}
      {STAND_SLIDES.length > 0 && (
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Saha Uygulamalarımız &amp; Market Standlarımız
              </h2>
              <p className="mt-2 text-gray-700">
                Ürünlerimizin raf ve stant yerleşimlerinden örnekler.
              </p>
            </div>

            <div
              className="relative w-full max-w-4xl mx-auto"
              aria-roledescription="carousel"
              aria-label="Saha uygulamaları ve market standı görselleri"
            >
              <div
                className="relative w-full overflow-hidden rounded-xl shadow-lg bg-black group cursor-pointer"
                onClick={() => setIsStandModalOpen(true)}
              >
                <div className="relative w-full pb-[56.25%] transition-transform duration-300 group-hover:scale-105">
                  <Image
                    key={STAND_SLIDES[activeSlide]?.src}
                    src={STAND_SLIDES[activeSlide]?.src}
                    alt={STAND_SLIDES[activeSlide]?.alt}
                    fill
                    className="object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Sol ok */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveSlide((prev) =>
                      prev === 0 ? STAND_SLIDES.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md hover:bg-white transition-colors"
                  aria-label="Önceki görsel"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Sağ ok */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveSlide(
                      (prev) => (prev + 1) % STAND_SLIDES.length
                    );
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md hover:bg-white transition-colors"
                  aria-label="Sonraki görsel"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Dots navigation */}
              <div className="mt-4 flex justify-center gap-2">
                {STAND_SLIDES.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      index === activeSlide
                        ? "bg-green-700"
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Görsel ${index + 1}`}
                    aria-pressed={index === activeSlide}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Toptan satış bilgilendirme kutusu + ürün grid */}
      <section className="bg-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-white rounded-2xl shadow-sm p-8 max-w-4xl mx-auto mt-10 mb-12 border border-green-600/30 hover:border-green-700/50 transition duration-200">
            <p className="text-xs tracking-widest text-gray-500 uppercase mb-4">
              Toptan Satış Koşulları
            </p>

            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>3&apos;lü koli bazlı fiyatlandırma uygulanmaktadır.</p>
              <p>Tüm ürünlerimiz adres teslim olarak sevk edilmektedir.</p>
              <p>İstanbul bölgesi için özel fiyatlandırma sunulmaktadır.</p>
              <p>Ürünlerimize +%1 KDV uygulanır.</p>
            </div>
          </div>

          {wholesaleLoading && (
            <div className="text-center text-gray-600 py-8">
              Toptan ürünler yükleniyor...
            </div>
          )}

          {wholesaleError && !wholesaleLoading && (
            <div className="text-center text-red-600 font-semibold py-8">
              {wholesaleError}
            </div>
          )}

          {!wholesaleLoading &&
            !wholesaleError &&
            wholesaleProducts.length === 0 && (
              <div className="text-center text-gray-600 py-8">
                Şu anda listelenecek toptan ürün bulunamadı.
              </div>
            )}

          {!wholesaleLoading &&
            !wholesaleError &&
            wholesaleProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {wholesaleProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/toptan/${product.slug}`}
                    className="flex h-full min-h-[520px] flex-col bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition duration-200"
                  >
                    {/* Ürün görseli */}
                    <div className="relative w-full aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                      {product.image_url && (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      )}
                    </div>

                    {/* İçerik alanı */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      {/* Başlık + fiyat */}
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {product.name}
                        </h3>

                        {/* Fiyat alanı */}
                        <div className="mt-4">
                          <p className="mt-1 text-2xl font-bold text-gray-900">
                            ₺{formatPrice(product.price)}
                          </p>
                        </div>
                      </div>

                      {/* Sepete ekle butonu */}
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const buttonRect =
                              e.currentTarget.getBoundingClientRect();
                            const startX =
                              buttonRect.left + buttonRect.width / 2;
                            const startY =
                              buttonRect.top + buttonRect.height / 2;

                            try {
                              triggerAnimation(startX, startY);
                            } catch (animationError) {
                              console.warn(
                                "Animation error:",
                                animationError
                              );
                            }

                            addItem(product);
                          }}
                          className="w-full py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      </section>

      {/* CTA - Toptan Fiyat Teklifi Al (Sayfa altı) */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-5xl text-center">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-green-700 px-8 py-4 text-white text-base md:text-lg font-semibold shadow-md hover:bg-green-800 transition-colors"
          >
            Toptan Fiyat Teklifi Al
          </button>
        </div>
      </section>

      {/* Stand görselleri için fullscreen zoom modal */}
      {isStandModalOpen && STAND_SLIDES.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Saha uygulamaları ve market standı görsel önizleme"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsStandModalOpen(false);
            }
          }}
        >
          {/* Kapat butonu */}
          <button
            type="button"
            onClick={() => setIsStandModalOpen(false)}
            className="absolute top-6 right-6 z-[10000] rounded-full bg-white/80 p-2 text-gray-800 shadow-md hover:bg-white transition-colors"
            aria-label="Görsel önizlemeyi kapat"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative max-w-5xl w-full flex items-center justify-center px-4">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <Image
                key={STAND_SLIDES[activeSlide]?.src}
                src={STAND_SLIDES[activeSlide]?.src}
                alt={STAND_SLIDES[activeSlide]?.alt}
                width={1920}
                height={1080}
                className="max-h-[90vh] w-auto object-contain"
                loading="lazy"
              />

              {/* Sol ok - modal içi */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveSlide((prev) =>
                    prev === 0 ? STAND_SLIDES.length - 1 : prev - 1
                  );
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-3 text-gray-800 shadow-md hover:bg-white transition-colors"
                aria-label="Önceki görsele geç"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Sağ ok - modal içi */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveSlide(
                    (prev) => (prev + 1) % STAND_SLIDES.length
                  );
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-3 text-gray-800 shadow-md hover:bg-white transition-colors"
                aria-label="Sonraki görsele geç"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-gray-900">
              Toptan Satışı Yapılan Ürün Grupları
            </h2>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Enginar bazlı ürünler</li>
              <li>Zeytinyağlı hazır yemekler</li>
              <li>Kavanoz ve vakumlu ürünler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">Neden Tek Lezzet?</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Sürdürülebilir Tedarik</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Planlı üretim ve güçlü operasyon altyapısı ile düzenli teslimat sağlar.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Kurumsal Çözüm Odaklılık</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  İşletme ihtiyaçlarına göre esnek paketleme ve ürün planlaması sunarız.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Standart Kalite</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Ürünlerimiz kurumsal kalite beklentilerini karşılayacak şekilde hazırlanır.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Hızlı Teklif Süreci</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Talebiniz doğrultusunda kısa sürede geri dönüş ve teklif sunarız.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">
              Toptan Satış Süreci Nasıl İşler?
            </h2>
            <ol className="mt-4 space-y-3 text-gray-700 list-decimal list-inside">
              <li>İhtiyaçlarınızı ve ürün grubunu belirleyin.</li>
              <li>İletişim kanallarımızdan teklif talebinizi iletin.</li>
              <li>Ürün, paketleme ve teslimat detaylarında birlikte planlama yapalım.</li>
              <li>Onay sonrası üretim ve sevkiyat sürecini başlatalım.</li>
            </ol>
          </section>

          <section className="rounded-2xl bg-green-50 border border-green-100 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900">Toptan Fiyat Teklifi Alın</h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              İşletmenize özel toptan teklif için bize ulaşın, ihtiyaçlarınıza uygun
              tedarik planını birlikte oluşturup hızlıca tekliflendirelim.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-green-700 px-6 py-3 text-white font-semibold shadow-sm hover:bg-green-800 transition-colors"
              >
                Toptan Fiyat Teklifi Al
              </button>
            </div>
          </section>
        </div>
      </section>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="toptan-modal-title"
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl outline-none md:rounded-2xl md:px-8 md:py-7 px-6 py-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h3
                id="toptan-modal-title"
                className="text-xl md:text-2xl font-bold text-gray-900"
              >
                Toptan Satış İçin Bizimle İletişime Geçin
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-gray-700">
              İşletmenize özel toptan fiyat teklifi almak için aşağıdaki iletişim
              kanallarından birini seçebilirsiniz.
            </p>
            <div className="mt-6 grid gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
              >
                WhatsApp’tan Yazın
              </a>
              <a
                href="tel:+905532350634"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
              >
                Hemen Arayın
              </a>
              <a
                href="mailto:mustafaerenalkan@gmail.com"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
              >
                E-posta Gönderin
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors.join(",")));
  return nodes.filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
}
