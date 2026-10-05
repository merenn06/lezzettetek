"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import AccountButton from "./AccountButton";
import AuthModal from "./AuthModal";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const { toggleMiniCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auth state kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        const data = await res.json();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();

    // Auth state değişikliği event'ini dinle (logout sonrası)
    const handleAuthStateChange = () => {
      checkAuth();
    };
    window.addEventListener('auth-state-changed', handleAuthStateChange);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
    };
  }, [pathname]); // Pathname değişince tekrar kontrol et (login/logout sonrası)

  const links = [
    { href: "/", label: "Ana Sayfa" },
    { href: "/urunlerimiz", label: "Perakende Satış Ürünlerimiz" },
    { href: "/toptan-satis", label: "Toptan Satış" },
    { href: "/tarifler", label: "Tarifler" },
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "/iletisim", label: "İletişim" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isCampaign995Active = pathname.startsWith("/995-kampanyasi");

  const campaignCtaBase =
    "inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold whitespace-nowrap transition-[transform,box-shadow,filter] duration-300 ease-out hover:scale-[1.03] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

  const campaignCtaGlow = isCampaign995Active
    ? "campaign-nav-cta-glow-active"
    : "campaign-nav-cta-glow";

  return (
    <header
      className={`sticky top-0 z-50 transition-shadow ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className="bg-green-50/70 backdrop-blur border-b border-green-200/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Sol: Logo */}
            <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/ana-sayfa-logo.webp"
                  alt="Tek Lezzet"
                  width={200}
                  height={56}
                  className="h-12 w-auto md:h-14"
                  sizes="(max-width: 768px) 120px, 160px"
                />
              </Link>
            </div>

            {/* Orta: Desktop Navigation (biraz sola kaydırılmış) */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-5 ml-12 text-sm flex-1 font-bold">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 pb-2 pt-1 border-b-2 border-transparent text-gray-700 transition-colors duration-150 ${
                    isActive(link.href)
                    ? "border-green-600 text-green-700"
                    : "hover:text-green-700 hover:border-green-300"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Sağ: Desktop - Kampanya CTA + Hesap + Sepet */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 xl:gap-4 flex-shrink-0">
              <Link
                href="/995-kampanyasi"
                aria-current={isCampaign995Active ? "page" : undefined}
                className={`${campaignCtaBase} ${campaignCtaGlow} px-2.5 py-1.5 text-[11px] lg:px-3 lg:py-1.5 lg:text-xs xl:px-4 xl:py-2 xl:text-sm`}
              >
                <span className="hidden xl:inline" aria-hidden>
                  🔥{" "}
                </span>
                <span className="hidden lg:inline">995 TL KAMPANYASI</span>
                <span className="lg:hidden">995 TL</span>
              </Link>
              <AccountButton
                isLoggedIn={isLoggedIn}
                variant="desktop"
                onOpenLogin={() => {
                  setAuthModalTab('login');
                  setAuthModalOpen(true);
                }}
                onOpenSignup={() => {
                  setAuthModalTab('signup');
                  setAuthModalOpen(true);
                }}
              />
              
              {/* Desktop Cart Button (triggers MiniCart) */}
              <button
                type="button"
                onClick={toggleMiniCart}
                className="relative inline-flex items-center justify-center rounded-full bg-green-700 text-white px-3 py-2 shadow-sm hover:bg-green-800 transition-colors"
                aria-label="Sepeti aç"
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {totalItems > 0 && (
                  <span className="ml-2 text-xs font-semibold">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Mobil: Sepet + Hamburger */}
            <div className="md:hidden flex items-center gap-2 flex-shrink-0">
              {/* Mobile Cart Button */}
              <button
                type="button"
                onClick={toggleMiniCart}
                className="relative inline-flex items-center justify-center rounded-full bg-green-700 text-white p-2 shadow-sm hover:bg-green-800 transition-colors"
                aria-label="Sepeti aç"
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Mobile Hamburger */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full p-2 text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Menüyü aç/kapat"
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? (
                  // X icon
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  // Hamburger icon
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileOpen && (
            <nav className="md:hidden mt-3 border-t border-green-100 pt-3">
              {/* Hesap alanı - en üstte */}
              <AccountButton
                isLoggedIn={isLoggedIn}
                variant="mobile"
                onOpenLogin={() => {
                  setAuthModalTab('login');
                  setAuthModalOpen(true);
                  setMobileOpen(false);
                }}
                onOpenSignup={() => {
                  setAuthModalTab('signup');
                  setAuthModalOpen(true);
                  setMobileOpen(false);
                }}
              />
              
              {/* Menü linkleri */}
              <div className="flex flex-col gap-2 mt-3">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-base font-bold transition-colors ${
                      isActive(link.href)
                        ? "bg-green-700 text-white"
                        : "text-gray-800 hover:bg-green-50 hover:text-green-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  href="/995-kampanyasi"
                  onClick={() => setMobileOpen(false)}
                  aria-current={isCampaign995Active ? "page" : undefined}
                  className={`mt-2 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-4 py-3 text-left text-white shadow-md transition-[transform,box-shadow] duration-300 active:scale-[0.99] ${
                    isCampaign995Active
                      ? "campaign-nav-cta-glow-active ring-2 ring-orange-300/80"
                      : "campaign-nav-cta-glow"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-tight">
                      🔥 995 TL KAMPANYASI
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-white/90">
                      Tek fiyat • Bir sürü seçenek
                    </span>
                  </span>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg leading-none"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          // Auth state'i tekrar kontrol et (login/signup sonrası)
          const checkAuth = async () => {
            try {
              const res = await fetch('/api/auth/user');
              const data = await res.json();
              setIsLoggedIn(!!data.user);
            } catch {
              setIsLoggedIn(false);
            }
          };
          checkAuth();
        }}
        initialTab={authModalTab}
      />
    </header>
  );
}
