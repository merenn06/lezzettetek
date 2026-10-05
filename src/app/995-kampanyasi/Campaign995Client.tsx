'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { getPackagesBySection } from '@/lib/campaign995/fetch-packages';
import {
  CAMPAIGN_995_SECTIONS,
  type Campaign995CategoryId,
} from '@/lib/campaign995/packages';
import type { Campaign995PackageView } from '@/types/campaign995-package';
import WaveDivider from './components/WaveDivider';
import Campaign995PackageCard from './components/Campaign995PackageCard';
import PromoBand from './components/PromoBand';

const PACKAGES_ANCHOR_ID = 'kampanya-paketleri';

const SECTION_SURFACE: Record<
  Campaign995CategoryId,
  {
    bg: string;
    titleColor: string;
    cardAccent: string;
    ctaLabel: 'PAKETİ SEÇ' | 'SEPETE EKLE';
  }
> = {
  reklam: {
    bg: '#FFF7ED',
    titleColor: 'text-red-800',
    cardAccent: 'bg-gradient-to-br from-red-600 via-orange-500 to-amber-400',
    ctaLabel: 'SEPETE EKLE',
  },
  tursu: {
    bg: '#ECFDF5',
    titleColor: 'text-green-900',
    cardAccent: 'bg-gradient-to-br from-green-700 via-green-600 to-emerald-400',
    ctaLabel: 'PAKETİ SEÇ',
  },
  klasik: {
    bg: '#FEF9C3',
    titleColor: 'text-amber-900',
    cardAccent: 'bg-gradient-to-br from-amber-500 via-orange-400 to-yellow-300',
    ctaLabel: 'PAKETİ SEÇ',
  },
  ozel: {
    bg: '#FFF1F2',
    titleColor: 'text-red-950',
    cardAccent: 'bg-gradient-to-br from-rose-700 via-red-600 to-orange-300',
    ctaLabel: 'PAKETİ SEÇ',
  },
};

const WAVE_AFTER: Partial<Record<Campaign995CategoryId, string>> = {
  reklam: SECTION_SURFACE.tursu.bg,
  tursu: SECTION_SURFACE.klasik.bg,
  klasik: SECTION_SURFACE.ozel.bg,
  ozel: '#FAF7F2',
};

function scrollToPackages() {
  document
    .getElementById(PACKAGES_ANCHOR_ID)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

type Campaign995ClientProps = {
  packages: Campaign995PackageView[];
};

export default function Campaign995Client({ packages }: Campaign995ClientProps) {
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setStickyVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleHeroCta = useCallback(() => {
    scrollToPackages();
  }, []);

  return (
    <div className="w-full overflow-x-hidden pb-24 md:pb-0">
      {/* ——— HERO ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-500 to-amber-400 px-1 pb-5 pt-2 sm:px-4 sm:pb-8 sm:pt-4">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-yellow-300/40 blur-3xl animate-[pulse_6s_ease-in-out_infinite]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-red-500/30 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/20 blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-[1200px]">
          <div className="flex flex-col items-center">
            <Image
              src="/995-kampanya-hero.webp"
              alt="Tek Lezzet — Ne alırsan 995 TL kampanyası"
              width={1536}
              height={1024}
              priority
              fetchPriority="high"
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="h-auto w-full max-w-full object-contain object-center"
            />
            <button
              type="button"
              onClick={handleHeroCta}
              className="mt-3 w-full rounded-2xl bg-red-600 px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-red-700 active:scale-[0.98] sm:mt-4 sm:py-4 sm:text-lg md:py-5 md:text-xl"
            >
              PAKETLERİ İNCELE ↓
            </button>
          </div>
        </div>
      </section>

      <WaveDivider topColor="#FBBF24" waveColor={SECTION_SURFACE.reklam.bg} flip />

      {/* ——— PRODUCT SECTIONS ——— */}
      {CAMPAIGN_995_SECTIONS.map((section, index) => {
        const surface = SECTION_SURFACE[section.id];
        const sectionPackages = getPackagesBySection(packages, section.id);
        const nextWave = WAVE_AFTER[section.id];

        return (
          <div key={section.id}>
            <section
              id={section.anchorId}
              className="scroll-mt-24 px-4 py-12 sm:py-16"
              style={{ backgroundColor: surface.bg }}
            >
              <div className="container mx-auto max-w-6xl">
                <header className="mb-8 text-center sm:mb-10">
                  <h2
                    className={`text-3xl font-black tracking-tight sm:text-4xl md:text-5xl ${surface.titleColor}`}
                  >
                    {section.title}
                  </h2>
                  {section.subtitle ? (
                    <p className="mx-auto mt-3 max-w-2xl text-base text-gray-700 sm:text-lg">
                      {section.subtitle}
                    </p>
                  ) : null}
                </header>

                <div
                  className={`grid grid-cols-1 items-start gap-6 sm:gap-8 ${
                    sectionPackages.length === 3
                      ? 'sm:grid-cols-2 lg:grid-cols-3'
                      : 'sm:grid-cols-2 max-w-4xl mx-auto'
                  }`}
                >
                  {sectionPackages.map((pkg) => (
                    <Campaign995PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      accentClass={surface.cardAccent}
                      ctaLabel={surface.ctaLabel}
                    />
                  ))}
                </div>
              </div>
            </section>

            {index === 0 ? (
              <PromoBand bgClass="bg-green-700">HEPSİ 995 TL!</PromoBand>
            ) : null}

            {index === 1 ? (
              <PromoBand bgClass="bg-orange-500" textClass="text-gray-900">
                <span className="block sm:inline">SEÇMESİ SENDEN,</span>{' '}
                <span className="block sm:inline">FİYATI BİZDEN: 995₺</span>
              </PromoBand>
            ) : null}

            {nextWave ? (
              <WaveDivider
                topColor={surface.bg}
                waveColor={nextWave}
              />
            ) : null}
          </div>
        );
      })}

      {/* ——— NASIL ÇALIŞIYOR ——— */}
      <section
        className="px-4 py-16 sm:py-20"
        style={{ backgroundColor: '#FAF7F2' }}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-black text-gray-900 sm:text-4xl md:text-5xl">
            NASIL ÇALIŞIYOR?
          </h2>
          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "995 TL'lik paketini seç",
              'Sepete ekle',
              'Ödeme yöntemini seç',
              'Biz kapına gönderelim',
            ].map((step, i) => (
              <li key={step} className="relative flex flex-col items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-xl font-black text-white shadow-lg">
                  {i + 1}
                </span>
                <p className="mt-4 text-base font-semibold leading-snug text-gray-800 sm:text-lg">
                  {step}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-14 text-4xl font-black tracking-tight text-green-800 sm:text-5xl md:text-6xl">
            KARGO BİZDEN
          </p>
        </div>
      </section>

      {/* ——— STICKY MOBILE CTA ——— */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform duration-300 md:hidden ${
          stickyVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          type="button"
          onClick={scrollToPackages}
          className="w-full rounded-xl bg-green-700 py-3.5 text-center text-sm font-black uppercase tracking-wide text-white shadow-md active:scale-[0.98]"
        >
          995 TL PAKETLERİ GÖR
        </button>
      </div>
    </div>
  );
}
