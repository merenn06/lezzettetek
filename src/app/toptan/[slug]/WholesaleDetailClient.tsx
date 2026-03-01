"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useFlyToCart } from "@/contexts/FlyToCartContext";
import { formatProductContentReact } from "@/lib/formatProductContentReact";

type WholesaleDetailClientProps = {
  product: Product;
};

export default function WholesaleDetailClient({
  product,
}: WholesaleDetailClientProps) {
  const { addItem } = useCart();
  const { triggerAnimation } = useFlyToCart();

  const formatPrice = (price: number) =>
    price.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const buttonRect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;

    try {
      triggerAnimation(startX, startY);
    } catch (err) {
      console.warn("Animation error:", err);
    }

    addItem(product);
  };

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

            {/* Sağ: Bilgi + CTA */}
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

              {/* Fiyat */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  +%1 KDV
                </p>
                <p className="mt-1 text-4xl font-bold text-green-700">
                  ₺{formatPrice(product.price)}
                </p>
              </div>

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

              {/* CTA: Sepete Ekle, Sepeti Görüntüle, Alışverişi Tamamla */}
              <div className="mt-auto space-y-4">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
                >
                  Sepete Ekle
                </button>
                <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
                    ✅ Katkısız
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
                    ✅ Vakumlu ambalaj
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
                    ✅ 1–3 günde kargo
                  </span>
                </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
