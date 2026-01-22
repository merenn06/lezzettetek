import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Toptan Enginar Satışı | Market ve Restoranlar İçin Kurumsal Tedarik",
  description:
    "Marketler, restoranlar ve işletmeler için toptan enginar ve zeytinyağlı ürün tedariki. Kurumsal satış ve özel fiyat teklifleri.",
};

export default function ToptanSatisPage() {
  return (
    <main className="bg-white">
      <section className="bg-gradient-to-br from-green-50 to-amber-50 py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
            Kurumsal Tedarik
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            Marketler, Restoranlar ve İşletmeler İçin Toptan Enginar ve Zeytinyağlı Ürün
            Tedariki
          </h1>
          <p className="mt-5 text-lg text-gray-700 leading-relaxed">
            Lezzette Tek, zincir marketler ve restoranlar dahil olmak üzere kurumsal
            işletmeler için güvenilir bir toptan tedarikçidir. Enginar ve zeytinyağlı
            ürün grubunda istikrarlı kalite, düzenli tedarik ve operasyonel
            kolaylık sunarız.
          </p>
          <div className="mt-8">
            <Link
              href="https://wa.me/90XXXXXXXXXX"
              className="inline-flex items-center justify-center rounded-xl bg-green-700 px-6 py-3 text-white font-semibold shadow-sm hover:bg-green-800 transition-colors"
            >
              Toptan Fiyat Teklifi Al
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-gray-900">Kimler İçin Uygun?</h2>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Zincir marketler ve yerel marketler</li>
              <li>Restoranlar, kafeler ve oteller</li>
              <li>Catering firmaları ve toplu yemek hizmetleri</li>
              <li>Kurumsal mutfaklar ve toplu tüketim noktaları</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">
              Toptan Satışı Yapılan Ürün Grupları
            </h2>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
              <li>Enginar bazlı ürünler</li>
              <li>Zeytinyağlı hazır yemekler</li>
              <li>Kavanoz ve vakumlu ürünler</li>
              <li>Dondurulmuş ürün seçenekleri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">Neden Lezzette Tek?</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Sürdürülebilir Tedarik</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Planlı üretim ve güçlü operasyon altyapısı ile düzenli teslimat sağlar.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Kurumsal Çözüm Odaklılık</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  İşletme ihtiyaçlarına göre esnek paketleme ve ürün planlaması sunarız.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Standart Kalite</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Ürünlerimiz kurumsal kalite beklentilerini karşılayacak şekilde hazırlanır.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">Hızlı Teklif Süreci</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                  Talebiniz doğrultusunda kısa sürede geri dönüş ve teklif sunarız.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900">
              Toptan Satış Süreci Nasıl İşler?
            </h2>
            <ol className="mt-4 space-y-3 text-gray-700 list-decimal list-inside">
              <li>İhtiyaçlarınızı ve ürün grubunu belirleyin.</li>
              <li>İletişim kanallarımızdan teklif talebinizi iletin.</li>
              <li>Ürün, paketleme ve teslimat detaylarında birlikte planlama yapalım.</li>
              <li>Onay sonrası üretim ve sevkiyat sürecini başlatalım.</li>
            </ol>
          </section>

          <section className="rounded-2xl bg-green-50 border border-green-100 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900">Toptan Fiyat Teklifi Alın</h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              İşletmenize özel toptan teklif için bize ulaşın, ihtiyaçlarınıza uygun
              tedarik planını birlikte oluşturup hızlıca tekliflendirelim.
            </p>
            <div className="mt-6">
              <Link
                href="https://wa.me/90XXXXXXXXXX"
                className="inline-flex items-center justify-center rounded-xl bg-green-700 px-6 py-3 text-white font-semibold shadow-sm hover:bg-green-800 transition-colors"
              >
                Toptan Fiyat Teklifi Al
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
