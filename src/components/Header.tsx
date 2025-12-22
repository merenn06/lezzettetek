"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

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

            {/* Navigation */}
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
          </div>
        </div>
      </div>
    </header>
  );
}
