import Link from 'next/link';
import Image from 'next/image';
import HeroSlider from '@/components/HeroSlider';
import PartnersLogos from '@/components/PartnersLogos';
import { getRecipes, type RecipeListItem } from '@/lib/recipes';

export default async function Home() {
  let recipes: RecipeListItem[] = [];
  try {
    recipes = (await getRecipes()).slice(0, 3);
  } catch (error) {
    console.error('Error fetching recipes:', error);
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-amber-50 py-24 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8 order-1">
              <div>
                <Image
                  src="/ana-sayfa-logo.webp"
                  alt="Lezzette Tek"
                  width={1000}
                  height={400}
                  className="h-40 sm:h-52 lg:h-72 w-auto mx-auto lg:mx-0"
                  priority
                />
              </div>
              <div className="lg:hidden">
                <div className="bg-gradient-to-br from-green-100 to-amber-100 rounded-xl p-2 md:p-4 shadow-lg">
                  <HeroSlider />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Doğanın En Taze
                <span className="block text-green-700">Lezzetleri</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-lg">
                Lezzette Tek olarak, doğal ve katkısız ürünlerimizle sofralarınıza sağlık ve lezzet getiriyoruz. 
                Yerli üretim, kaliteli içerik.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/urunlerimiz"
                  className="px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors text-center shadow-md"
                >
                  Ürünlerimiz
                </Link>
                <Link
                  href="/tarifler"
                  className="px-8 py-4 bg-white text-green-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center shadow-md border-2 border-green-700"
                >
                  Tarifler
                </Link>
                <Link
                  href="/toptan-satis"
                  className="px-8 py-4 bg-white text-green-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center shadow-md border-2 border-green-700"
                >
                  Toptan Satış
                </Link>
              </div>
            </div>
            
            {/* Right Side - Hero Slider */}
            <div className="relative order-2 hidden lg:block">
              <div className="bg-gradient-to-br from-green-100 to-amber-100 rounded-xl p-2 md:p-4 shadow-lg">
                <HeroSlider />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Logos Section */}
      <PartnersLogos />

      {/* Featured Products Section */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
            Öne Çıkan Ürünler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Product Card 1 */}
            <Link
              href="/urunlerimiz"
              className="group bg-[#FAFAF7] rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 ease-out flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] md:aspect-square w-full bg-[#FAFAF7]">
                <Image
                  src="/ana-sayfa-enginar-konservesi.webp"
                  alt="Enginar Konservesi"
                  fill
                  className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.06)]"
                  sizes="(min-width: 768px) 33vw, 100vw"
                  priority
                />
              </div>
              <div className="p-6 flex-1 space-y-2">
                <p className="text-sm uppercase tracking-[0.12em] text-green-700 font-semibold">
                  Kategori Vitrini
                </p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Enginar Konservesi
                </h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  Doğal, katkısız ve şef dokunuşuyla hazırlanan enginar konserveleri.
                </p>
              </div>
            </Link>

            {/* Product Card 2 */}
            <Link
              href="/urunlerimiz"
              className="group bg-[#FAFAF7] rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 ease-out flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] md:aspect-square w-full bg-[#FAFAF7]">
                <Image
                  src="/ana-sayfa-garnitur.webp"
                  alt="garnitur"
                  fill
                  className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.06)]"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
              </div>
              <div className="p-6 flex-1 space-y-2">
                <p className="text-sm uppercase tracking-[0.12em] text-green-700 font-semibold">
                  Kategori Vitrini
                </p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Garnitür
                </h3>
                <p className="text-gray-600 text-base leading-relaxed">
                Özenle seçilmiş sebzelerle hazırlanan, sofralara uyumlu garnitürler.
                </p>
              </div>
            </Link>

            {/* Product Card 3 */}
            <Link
              href="/urunlerimiz"
              className="group bg-[#FAFAF7] rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 ease-out flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] md:aspect-square w-full bg-[#FAFAF7]">
                <Image
                  src="/ana-sayfa-dogranmis-domates.webp"
                  alt="domates sosu"
                  fill
                  className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.06)]"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
              </div>
              <div className="p-6 flex-1 space-y-2">
                <p className="text-sm uppercase tracking-[0.12em] text-green-700 font-semibold">
                  Kategori Vitrini
                </p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Domates Sosu
                </h3>
                <p className="text-gray-600 text-base leading-relaxed">
                Geleneksel yöntemlerle hazırlanan, yoğun lezzetli domates sosları.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Advantages Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Advantage 1 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Doğal İçerik</h3>
              <p className="text-gray-600">
                Tüm ürünlerimiz doğal içeriklerden üretilir, katkı maddesi içermez.
              </p>
            </div>

            {/* Advantage 2 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Yerli Üretim</h3>
              <p className="text-gray-600">
                Yerli üreticilerimizle çalışarak kaliteli ve taze ürünler sunuyoruz.
              </p>
            </div>

            {/* Advantage 3 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Katkısız Lezzet</h3>
              <p className="text-gray-600">
                Hiçbir katkı maddesi kullanmadan, doğal lezzeti koruyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Preview Section */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
            Tariflerden İlham Al
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recipes.map((recipe, index) => {
              const descriptionSource = recipe.shortDescription ?? '';
              const description =
                descriptionSource.length > 120
                  ? descriptionSource.slice(0, 120) + '...'
                  : descriptionSource;

              const gradients = [
                'from-green-200 to-green-300',
                'from-amber-200 to-amber-300',
                'from-green-200 to-amber-200',
              ];

              const gradient = gradients[index % gradients.length];

              return (
                <Link
                  key={recipe.id}
                  href={`/tarifler/${recipe.slug}`}
                  className="bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div
                    className={`aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
                  >
                    {recipe.imageUrl ? (
                      <Image
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        width={600}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-green-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-6 flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{recipe.title}</h3>
                    <p className="text-gray-600 text-sm">{description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
