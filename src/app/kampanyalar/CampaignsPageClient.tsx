'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Campaign } from '@/types/campaign';

type CampaignsPageClientProps = {
  campaigns: Campaign[];
};

export default function CampaignsPageClient({ campaigns }: CampaignsPageClientProps) {
  const [selected, setSelected] = useState<Campaign | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const closeModal = useCallback(() => {
    setSelected(null);
  }, []);

  // Body scroll lock + ESC close
  useEffect(() => {
    if (selected) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeModal();
        }

        if (event.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Focus first element when modal opens
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 0);

      return () => {
        document.body.style.overflow = originalStyle;
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selected, closeModal]);

  return (
    <div className="w-full bg-white">
      <section className="py-24 px-4 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Kampanyalar</h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Sizin için seçtiğimiz güncel kampanyalarımızı keşfedin. Avantajlı fırsatları kaçırmayın.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/urunlerimiz"
              className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ürünlerimiz
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto">
          {campaigns.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              Şu anda aktif kampanyamız bulunmuyor. Yeni fırsatlar için yakında tekrar kontrol edin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelected(campaign)}
                  className="group bg-[#FAFAF7] rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 ease-out flex flex-col text-left hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <div className="relative aspect-[2/1] w-full bg-gray-100">
                    <Image
                      src={campaign.image_url_mobile || campaign.image_url_desktop}
                      alt={campaign.title}
                      fill
                      className="object-cover md:hidden"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <Image
                      src={campaign.image_url_desktop}
                      alt={campaign.title}
                      fill
                      className="hidden md:block object-cover"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-green-700/90 text-white text-xs font-semibold px-3 py-1 shadow-sm">
                      Aktif
                    </span>
                  </div>
                  <div className="p-5 flex-1 space-y-2">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-700">
                      {campaign.title}
                    </h2>
                    {campaign.subtitle && (
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.subtitle}</p>
                    )}
                    <div className="pt-2">
                      <span className="inline-flex items-center text-sm font-semibold text-green-700">
                        Detayları gör
                        <svg
                          className="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
          aria-labelledby="campaign-modal-title"
          aria-describedby="campaign-modal-description"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              aria-label="Kampanya detayını kapat"
            >
              <span className="sr-only">Kapat</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative aspect-[2/1] w-full bg-gray-100">
              <Image
                src={selected.image_url_mobile || selected.image_url_desktop}
                alt={selected.title}
                fill
                className="object-cover md:hidden"
                sizes="100vw"
              />
              <Image
                src={selected.image_url_desktop}
                alt={selected.title}
                fill
                className="hidden md:block object-cover"
                sizes="768px"
              />
            </div>

            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="campaign-modal-title"
                    className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2"
                  >
                    {selected.title}
                  </h2>
                  {selected.subtitle && (
                    <p
                      id="campaign-modal-description"
                      className="text-gray-700 text-sm md:text-base leading-relaxed"
                    >
                      {selected.subtitle}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 mt-1">
                  Aktif
                </span>
              </div>

              {Array.isArray(selected.bullets) && selected.bullets.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {selected.bullets.map((item, index) => (
                    <li key={index} className="flex items-start text-sm md:text-base text-gray-800">
                      <span className="mt-1 mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-4 flex flex-wrap justify-start items-center gap-3">
                <Link
                  href="/urunlerimiz"
                  className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Ürünlerimizi keşfedin
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

