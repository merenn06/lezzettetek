'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { CAMPAIGN_995_PRICE, campaign995DetailPath } from '@/lib/campaign995/packages';
import type { Campaign995PackageView } from '@/types/campaign995-package';

type Campaign995PackageCardProps = {
  pkg: Campaign995PackageView;
  accentClass: string;
  ctaLabel?: 'PAKETİ SEÇ' | 'SEPETE EKLE';
};

export default function Campaign995PackageCard({
  pkg,
  accentClass,
  ctaLabel = 'PAKETİ SEÇ',
}: Campaign995PackageCardProps) {
  const { addItem } = useCart();

  const detailHref = campaign995DetailPath(pkg.slug);
  const displayPrice =
    pkg.price === CAMPAIGN_995_PRICE ? '995₺' : `${pkg.price}₺`;
  /** Kampanya posteri (image_url) varsa metin/fiyat alanı yok — sadece görsel + CTA */
  const isCampaignPosterCard = !!pkg.image;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      ...pkg.cartProduct,
      image_url: pkg.cartProduct.image_url || pkg.image || '',
    });
  };

  if (isCampaignPosterCard) {
    return (
      <article className="group relative w-full self-start overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <Link href={detailHref} className="relative block aspect-square w-full">
          <Image
            src={pkg.image!}
            alt={`${pkg.quantityLabel} ${pkg.name} — 995 TL kampanya`}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
          />
        </Link>
        <div className="flex h-[78px] items-center px-3 sm:px-3.5">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full rounded-xl bg-green-700 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-green-800 active:scale-[0.98] sm:text-base"
            aria-label={`${pkg.quantityLabel} ${pkg.name} — ${ctaLabel}`}
          >
            {ctaLabel}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-black/5 bg-white shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={detailHref} className="block">
        <div
          className={`relative aspect-[4/5] w-full overflow-hidden sm:aspect-[3/4] ${accentClass}`}
        >
          {pkg.image ? (
            <Image
              src={pkg.image}
              alt={`${pkg.quantityLabel} ${pkg.name} — 995 TL kampanya`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                <svg
                  className="h-10 w-10 text-white/90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-white/90">
                Ürün görseli yakında
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-md sm:text-sm">
            {pkg.quantityLabel}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <h3 className="text-lg font-bold leading-snug text-gray-900 sm:text-xl">
            {pkg.name}
          </h3>
          <p className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            {displayPrice}
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full rounded-xl bg-green-700 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-colors hover:bg-green-800 active:scale-[0.98] sm:py-4 sm:text-base"
          aria-label={`${pkg.quantityLabel} ${pkg.name} — ${ctaLabel}`}
        >
          {ctaLabel}
        </button>
      </div>
    </article>
  );
}
