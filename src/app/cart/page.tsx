'use client';

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, clearCart, getTotalPrice } = useCart();

  // Format price helper
  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper to get product gradient for thumbnail
  const getProductGradient = (category?: string) => {
    switch (category) {
      case 'kavanoz':
        return 'from-amber-200 to-amber-300';
      case 'dondurulmus':
        return 'from-blue-200 to-blue-300';
      case 'atistirmalik':
        return 'from-orange-200 to-orange-300';
      default:
        return 'from-green-200 to-green-300';
    }
  };

  const totalPrice = getTotalPrice();

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/urunlerimiz"
            className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Alışverişe Devam Et
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Sepetim</h1>
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto mb-6 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sepetiniz boş</h2>
            <p className="text-gray-600 mb-8">Sepetinize henüz ürün eklenmemiş.</p>
            <Link
              href="/urunlerimiz"
              className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors"
            >
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const itemPrice = item.product.price || 0;
                const itemTotal = itemPrice * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="bg-white rounded-xl shadow-md p-6 flex gap-6"
                  >
                    {/* Product Image */}
                    <Link
                      href={`/urunlerimiz/${item.product.slug}`}
                      className={`w-24 h-24 bg-gradient-to-br ${getProductGradient(
                        item.product.category
                      )} rounded-lg flex-shrink-0 flex items-center justify-center`}
                    >
                      <svg
                        className="w-12 h-12 text-white opacity-80"
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
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1">
                      <Link
                        href={`/urunlerimiz/${item.product.slug}`}
                        className="text-xl font-bold text-gray-900 hover:text-green-700 transition-colors mb-2 block"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-gray-600 text-sm mb-3">
                        {item.product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                          <p className="text-lg font-semibold text-green-700 mt-1">
                            {formatPrice(itemTotal)} ₺
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                          aria-label="Sepetten Kaldır"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Özeti</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Ara Toplam:</span>
                    <span className="font-semibold">{formatPrice(totalPrice)} ₺</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Kargo:</span>
                    <span className="font-semibold">Ücretsiz</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Toplam:</span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatPrice(totalPrice)} ₺
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/checkout"
                    className="block w-full py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md text-center"
                  >
                    Alışverişi Tamamla
                  </Link>
                  <button
                    onClick={clearCart}
                    className="w-full py-3 bg-white text-red-600 border-2 border-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
                  >
                    Sepeti Temizle
                  </button>
                  <Link
                    href="/urunlerimiz"
                    className="block w-full py-3 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors text-center"
                  >
                    Alışverişe Devam Et
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

