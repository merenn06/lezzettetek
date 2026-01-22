import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#f8f8f8] mt-auto">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Column: Brand Summary */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Lezzette Tek</h3>
            <p className="text-gray-600 leading-relaxed">
            Doğal içerikler, yerli üretim ve özenli bir hazırlık süreciyle ürünlerimizi güvenle sunuyoruz.
Katkısız yapıyı, kalite standartlarını ve istikrarlı lezzeti ön planda tutuyoruz.
Lezzette tek nokta olma yaklaşımımız, tüm üretim anlayışımızın temelidir.
            </p>
          </div>

          {/* Middle Column: Navigation Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900">Site Haritası</h3>
            <nav className="flex flex-col gap-3">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Ana Sayfa
              </Link>
              <Link 
                href="/hakkimizda" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Hakkımızda
              </Link>
              <Link 
                href="/urunlerimiz" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Ürünlerimiz
              </Link>
              <Link 
                href="/tarifler" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Tarifler
              </Link>
              <Link 
                href="/toptan-satis" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Toptan Satış
              </Link>
              <Link 
                href="/iletisim" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                İletişim
              </Link>
            </nav>
          </div>

          {/* Right Column: Contact & Social */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900">İletişim</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600 leading-relaxed">
                Kayışdağı Mahallesi Hilal Sokak No:21<br />
                Ataşehir / İstanbul
              </p>
              <p className="text-gray-600">
                <a 
                  href="mailto:info@teklezzet.com" 
                  className="hover:text-green-700 transition-colors"
                >
                  info@teklezzet.com
                </a>
              </p>
              <p className="text-gray-600">
                <a 
                  href="tel:+905317039591" 
                  className="hover:text-green-700 transition-colors"
                >
                  +90 (531) 703 95 91
                </a>
              </p>
              <p className="text-gray-600">
                <a 
                  href="tel:+902166021051" 
                  className="hover:text-green-700 transition-colors"
                >
                  +90 (216) 602 10 51
                </a>
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/lezzettetek/"
                target='_blank'
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-green-100 hover:shadow-md transition-all"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-green-100 hover:shadow-md transition-all"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-200 pt-6 pb-4">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600 font-medium">Güvenli Ödeme Yöntemleri</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center justify-center h-8 w-auto">
                <Image
                  src="/iyzico_ile_ode_colored.svg"
                  alt="iyzico ile öde"
                  width={120}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-center h-8 w-auto">
                <Image
                  src="/visa-10.svg"
                  alt="Visa"
                  width={60}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-center h-8 w-auto">
                <Image
                  src="/ma_symbol.svg"
                  alt="Mastercard"
                  width={60}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © 2025 Lezzette Tek. Tüm hakları saklıdır.
            </p>
            <nav className="flex flex-wrap justify-center gap-4 text-sm">
              <Link 
                href="/teslimat-ve-iade-sartlari" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Teslimat ve İade Şartları
              </Link>
              <Link 
                href="/gizlilik-sozlesmesi" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Gizlilik Sözleşmesi
              </Link>
              <Link 
                href="/mesafeli-satis-sozlesmesi" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                Mesafeli Satış Sözleşmesi
              </Link>
              <Link 
                href="/kvkk" 
                className="text-gray-600 hover:text-green-700 transition-colors"
              >
                KVKK
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

