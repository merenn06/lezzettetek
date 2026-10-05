'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { CAMPAIGN_995_PRICE } from '@/lib/campaign995/packages';
import type { Campaign995PackageView } from '@/types/campaign995-package';

type Campaign995DetailClientProps = {
  pkg: Campaign995PackageView;
};

export default function Campaign995DetailClient({ pkg }: Campaign995DetailClientProps) {
  const { addItem } = useCart();

  const imageSrc = pkg.image || pkg.cartProduct.image_url || null;
  const inStock = pkg.cartProduct.stock > 0;
  const displayPrice =
    pkg.price === CAMPAIGN_995_PRICE
      ? `${CAMPAIGN_995_PRICE.toLocaleString('tr-TR')} TL`
      : `${pkg.price.toLocaleString('tr-TR')} TL`;

  const handleAddToCart = () => {
    if (!inStock) return;
    addItem({
      ...pkg.cartProduct,
      image_url: pkg.cartProduct.image_url || pkg.image || '',
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/995-kampanyasi"
            className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            995 TL Kampanyasına Dön
          </Link>
        </div>

        <div className="rounded-2xl bg-white shadow-lg p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt={`${pkg.quantityLabel} ${pkg.name} — 995 TL kampanya`}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-green-200 to-green-300 p-6 text-center">
                  <span className="text-sm font-medium text-gray-700">Kampanya görseli yakında</span>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700 mb-2">
                995 TL Kampanya Paketi
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{pkg.name}</h1>
              <p className="text-lg text-gray-700 mb-2">Paket içeriği: {pkg.quantityLabel}</p>
              {pkg.packQuantity > 0 && (
                <p className="text-sm text-gray-500 mb-6">
                  Sepete eklediğiniz her adet 1 kampanya paketidir ({pkg.quantityLabel}).
                </p>
              )}

              <p className="text-4xl font-black text-gray-900 mb-6">{displayPrice}</p>

              {!inStock ? (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  Bu kampanya paketi şu an stokta yok.
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className="w-full rounded-xl bg-green-700 py-4 text-base font-bold uppercase tracking-wide text-white shadow-md transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400 sm:max-w-md"
              >
                Sepete Ekle
              </button>

              {pkg.cartProduct.description ? (
                <p className="mt-8 text-gray-600 leading-relaxed">{pkg.cartProduct.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
