"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function ToptanSatisClient() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const whatsappMessage = useMemo(
    () =>
      "Merhaba, Lezzette Tek toptan satış için fiyat teklifi almak istiyorum. Firma adım: __ / Şehir: __ / Tahmini aylık alım: __.",
    []
  );

  const whatsappLink = useMemo(() => {
    const encoded = encodeURIComponent(whatsappMessage);
    return `https://wa.me/905532350634?text=${encoded}`;
  }, [whatsappMessage]);

  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <main className="bg-white">
      <section className="bg-gradient-to-br from-green-50 to-amber-50 py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
            Kurumsal Tedarik
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            Marketler, Restoranlar ve İşletmeler İçin Toptan Enginar ve Zeytinyağlı Ürün
            Tedariki
          </h1>
          <p className="mt-5 text-lg text-gray-700 leading-relaxed">
            Lezzette Tek, zincir marketler ve restoranlar dahil olmak üzere kurumsal
            işletmeler için güvenilir bir toptan tedarikçidir. Enginar ve zeytinyağlı
            ürün grubunda istikrarlı kalite, düzenli tedarik ve operasyonel
            kolaylık sunarız.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-green-700 px-6 py-3 text-white font-semibold shadow-sm hover:bg-green-800 transition-colors"
            >
              Toptan Fiyat Teklifi Al
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-gray-900">Kimler İçin Uygun?</h2>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Zincir marketler ve yerel marketler</li>
              <li>Restoranlar, kafeler ve oteller</li>
              <li>Catering firmaları ve toplu yemek hizmetleri</li>
              <li>Kurumsal mutfaklar ve toplu tüketim noktaları</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">
              Toptan Satışı Yapılan Ürün Grupları
            </h2>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Enginar bazlı ürünler</li>
              <li>Zeytinyağlı hazır yemekler</li>
              <li>Kavanoz ve vakumlu ürünler</li>
              <li>Dondurulmuş ürün seçenekleri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">Neden Lezzette Tek?</h2>
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
