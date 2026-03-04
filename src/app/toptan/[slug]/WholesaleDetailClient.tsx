"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import type { Product } from "@/types/product";
import { formatProductContentReact } from "@/lib/formatProductContentReact";

type WholesaleDetailClientProps = {
  product: Product;
};

export default function WholesaleDetailClient({
  product,
}: WholesaleDetailClientProps) {
  const whatsappMessage = useMemo(
    () =>
      "Merhaba, Tek Lezzet toptan satış için fiyat teklifi almak istiyorum. Firma adım: __ / Şehir: __ / Tahmini aylık alım: __.",
    []
  );

  const whatsappLink = useMemo(() => {
    const encoded = encodeURIComponent(whatsappMessage);
    return `https://wa.me/905532350634?text=${encoded}`;
  }, [whatsappMessage]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Link
          href="/toptan-satis"
          className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors text-sm font-medium mb-8"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Toptan satışa dön
        </Link>

        <div className="rounded-2xl bg-white shadow-lg p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Sol: Ürün görseli */}
            <div className="flex items-center justify-center">
              <div className="w-full aspect-square max-h-[480px] lg:max-h-none rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg
                      className="w-24 h-24"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Sağ: Bilgi */}
            <div className="flex flex-col">
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
                {product.name}
              </h1>

              {/* Menşei */}
              {product.origin && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Menşei:</span> {product.origin}
                </p>
              )}

              {/* Birim Fiyat */}
              {product.unit_price_text?.trim() && (
                <p className="text-sm font-bold text-gray-700 mb-4">
                  Birim Fiyat: {product.unit_price_text.trim()}
                </p>
              )}

              {/* İçindekiler / Ürün İçeriği */}
              {product.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    Ürün İçeriği
                  </h2>
                  <div className="text-gray-700 leading-relaxed">
                    {formatProductContentReact(product.description)}
                  </div>
                </div>
              )}

              {/* Toptan fiyat teklifi CTA */}
              <div className="mt-4">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-800 transition-colors"
                >
                  Toptan Fiyat Teklifi Al
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
