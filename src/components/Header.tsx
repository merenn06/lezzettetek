"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { href: "/", label: "Ana Sayfa" },
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "/urunlerimiz", label: "Ürünlerimiz" },
    { href: "/tarifler", label: "Tarifler" },
    { href: "/iletisim", label: "İletişim" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-shadow ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className="bg-green-50/70 backdrop-blur border-b border-green-200/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo / Brand */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/brand-logo.webp"
                alt="Lezzette Tek"
                width={200}
                height={56}
                className="h-12 w-auto md:h-14"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-5 text-sm">
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

            {/* Mobile Hamburger */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-full p-2 text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
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

          {/* Mobile Navigation */}
          {mobileOpen && (
            <nav className="md:hidden mt-3 border-t border-green-100 pt-3">
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-green-700 text-white"
                        : "text-gray-800 hover:bg-green-50 hover:text-green-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
