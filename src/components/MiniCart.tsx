 'use client';

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { remainingForFreeShipping } from '@/lib/shipping';

export default function MiniCart() {
  const {
    items,
    isMiniCartOpen,
    closeMiniCart,
    toggleMiniCart,
    getTotalItems,
    getTotalPrice,
    removeItem,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const cartRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [isHover, setIsHover] = useState(false);

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

  // Track mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll-based opacity for mobile
  useEffect(() => {
    if (!isMobile) {
      setScrollOpacity(1);
      return;
    }

    const handleScroll = () => {
      const maxScroll = 300; // px
      const y = window.scrollY;
      const t = Math.min(y / maxScroll, 1);
      const opacity = 1 - 0.3 * t; // 1 -> 0.7
      setScrollOpacity(opacity);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the cart icon/button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-cart-trigger]')) {
          closeMiniCart();
        }
      }
    };

    if (isMiniCartOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMiniCartOpen, closeMiniCart]);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const remaining = remainingForFreeShipping(totalPrice);

  const buttonOpacity = !isMobile ? 1 : isHover ? 1 : scrollOpacity;

  return (
    <>
      {/* Cart Icon Button - Mobile only (desktop header için ayrı ikon eklenecek) */}
      <button
        id="cart-icon"
        data-cart-trigger
        onClick={toggleMiniCart}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        style={isMobile ? { opacity: buttonOpacity } : undefined}
        className="fixed right-4 top-20 z-40 bg-green-700 text-white p-3 rounded-full shadow-lg hover:bg-green-800 transition-colors flex items-center justify-center md:hidden"
        aria-label="Sepet"
      >
        <svg
          className="w-6 h-6"
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
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalItems}
          </span>
        )}
      </button>

      {/* Mini Cart Panel */}
      {isMiniCartOpen && (
        <div
          ref={cartRef}
          className="fixed top-16 right-4 z-50 w-80 md:w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[calc(100vh-5rem)] transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-green-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">Sepetim</h2>
            <button
              onClick={closeMiniCart}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
              aria-label="Kapat"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
                <p className="text-sm">Sepetiniz boş</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const itemPrice = item.product.price || 0;
                  const itemTotal = itemPrice * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      {/* Thumbnail */}
                      {item.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-16 h-16 bg-gradient-to-br from-green-200 to-green-400 rounded-lg flex-shrink-0 flex items-center justify-center"
                        >
                          <svg
                            className="w-8 h-8 text-white opacity-80"
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
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {item.product.name}
                        </h3>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => decreaseQuantity(item.product.id)}
                            className="w-6 h-6 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors flex items-center justify-center text-sm font-semibold"
                            aria-label="Azalt"
                          >
                            −
                          </button>
                          <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQuantity(item.product.id)}
                            className="w-6 h-6 rounded-md bg-green-700 hover:bg-green-800 text-white transition-colors flex items-center justify-center text-sm font-semibold"
                            aria-label="Artır"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-sm font-semibold text-green-700 mt-2">
                          {formatPrice(itemTotal)} ₺
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 flex-shrink-0"
                        aria-label="Kaldır"
                      >
                        <svg
                          className="w-4 h-4"
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Total and View Cart Button */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">
              {/* Shipping info message */}
              {remaining > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-xs text-green-800 text-center">
                  <span className="font-semibold">Ücretsiz kargoya {formatPrice(remaining)} TL kaldı</span>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-xs text-green-800 text-center">
                  <span className="font-semibold">Kargo Ücretsiz</span>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-gray-900">Toplam:</span>
                <span className="text-xl font-bold text-green-700">
                  {formatPrice(totalPrice)} ₺
                </span>
              </div>
              <Link
                href="/cart"
                onClick={closeMiniCart}
                className="block w-full py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors text-center"
              >
                Sepeti Görüntüle
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
