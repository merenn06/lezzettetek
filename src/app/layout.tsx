import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { FlyToCartProvider } from "@/contexts/FlyToCartContext";
import MiniCart from "@/components/MiniCart";
import FlyToCartAnimation from "@/components/FlyToCartAnimation";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lezzette Tek",
  description: "Lezzette Tek - Doğal ve Taze Ürünler",
  verification: {
    google: "kMWicVXQeB6XgXuaE8VyEbIaXPF1_vvNU2CWEaKVxOI",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.png', sizes: 'any', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${playfair.variable} ${inter.variable}`}>
      <body className="flex flex-col min-h-screen font-sans">
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-P70KBVS3CT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-P70KBVS3CT');
          `}
        </Script>
        <CartProvider>
          <FlyToCartProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <MiniCart />
            <FlyToCartAnimation />
          </FlyToCartProvider>
        </CartProvider>
      </body>
    </html>
  );
}

