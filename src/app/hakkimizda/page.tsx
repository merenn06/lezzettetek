import Image from 'next/image';

export default function Hakkimizda() {
  const milestones = [
    {
      year: '2014',
      title: 'Kuruluş',
      description:
        'Doğal ve güvenilir gıdaya olan ihtiyacımızdan yola çıkarak Lezzette Tek markasının temellerini attık.',
    },
    {
      year: '2015',
      title: 'Ürün Yelpazesi Genişledi',
      description:
        'Müşteri talepleri doğrultusunda ürün çeşitliliğimizi artırdık; bamya ürünlerimizi yelpazemize ekledik.',
    },
    {
      year: '2017',
      title: 'Yeni Ürün Ailesi',
      description:
        'Müşteri talepleri doğrultusunda ürün çeşitliliğimizi artırdık; domates sosu, enginar kalbi, bezelye, garnitür ve kereviz ürünlerini portföyümüze dahil ettik.',
    },
    {
      year: '2025',
      title: 'Online Satış',
      description:
        'Dijital satış kanallarımızı devreye alarak ürünlerimizi daha fazla sofraya ulaştırmaya başladık.',
    },
  ];

  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <section className="py-24 xl:py-32 px-4 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Hakkımızda
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Lezzette Tek, doğanın en taze ve kaliteli ürünlerini sofralarınıza getirmek için 
            kurulmuş bir markadır. Doğallıktan ödün vermeden, yerli üretimle kaliteyi birleştiriyoruz.
          </p>
        </div>
      </section>

      {/* Story Section - Two Column */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Story Text */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Hikayemiz
              </h2>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  <strong className="text-gray-900">2014 yılında, doğal ve güvenilir gıdaya duyduğumuz ihtiyacı</strong> merkeze
                  alarak yola çıktık. Amacımız, <strong className="text-gray-900">doğanın sunduğu lezzetleri en saf haliyle korumak</strong> ve
                  bu değeri sofralara taşımaktı. Bugün <strong className="text-gray-900">Lezzette Tek</strong> olarak, bu anlayışla hazırladığımız
                  ürünleri aynı özenle sunmaya devam ediyoruz.
                </p>

                <p>
                  Üretim sürecimizin temelinde <strong className="text-gray-900">doğallık ve yerli üretim</strong> yer alır. Ürünlerimiz için
                  kullandığımız sebzeleri, <strong className="text-gray-900">yerli üreticilerimizden</strong> temin eder; her aşamada
                  <strong className="text-gray-900"> kalite ve tazeliği</strong> önceliklendiririz. Katkı maddesi kullanmadan, ürünlerin kendi
                  lezzetini ve dokusunu koruyacak yöntemlerle üretim yaparız.
                </p>

                <p>
                  Yıllar içinde edindiğimiz deneyimle, <strong className="text-gray-900">her üründe aynı standartları uygulamayı  </strong>
                   benimsedik. Üretimden paketlemeye kadar tüm süreçlerde titizlikle çalışır, her kavanozda
                  <strong className="text-gray-900"> güven ve lezzeti bir arada</strong> sunmayı hedefleriz.
                </p>

                <p>
                  Bugün, 2014’te attığımız ilk adımın arkasında durarak; <strong className="text-gray-900">doğallığı, yerli üretimi ve emeği
                  ön planda tutan</strong> ürünlerimizi daha fazla sofrayla buluşturmanın mutluluğunu yaşıyoruz.
                </p>
              </div>
            </div>

            {/* Right Side - Brand Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-green-100 to-amber-100 rounded-xl p-4 md:p-6 lg:p-8 shadow-lg">
                <div className="relative aspect-square bg-white rounded-xl shadow-md overflow-hidden">
                  <Image
                    src="/hakkimizda.webp"
                    alt="Lezzette Tek Marka Görseli"
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 480px, (min-width: 768px) 400px, 100vw"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Mission Card */}
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Misyonumuz</h3>
              <p className="text-gray-700 leading-relaxed">
                <strong className="text-gray-900">Yerli üreticilerimizden temin ettiğimiz sebzeleri</strong>, doğal
                yöntemlerle ve katkı maddesi kullanmadan işleyerek sofralara ulaştırmak temel misyonumuzdur.
                Üretimin her aşamasında <strong className="text-gray-900">kaliteyi, şeffaflığı ve sürdürülebilirliği</strong> ön planda
                tutarak; her kavanozda <strong className="text-gray-900">güvenilir ve lezzetli ürünler</strong> sunmak için çalışırız.
              </p>
            </div>

            {/* Vision Card */}
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Vizyonumuz</h3>
              <p className="text-gray-700 leading-relaxed">
                <strong className="text-gray-900">Doğal ve güvenilir gıdaya erişimin herkes için mümkün olduğu</strong> bir gelecek
                hayal ediyoruz. <strong className="text-gray-900">Yerli üretimi destekleyen, doğallıktan ödün vermeden büyüyen</strong> ve
                sofralarda <strong className="text-gray-900">güvenle tercih edilen bir marka</strong> olarak; kaliteli ürünlerimizle uzun
                yıllar boyunca yer almayı hedefliyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
            Yolculuğumuz
          </h2>
          
          <div className="max-w-4xl mx-auto">
            {/* Desktop Timeline - Horizontal */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-green-200 via-green-300 to-green-200"></div>
                
                {/* Timeline Items */}
                <div className="relative flex justify-between">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      {/* Dot */}
                      <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center shadow-lg z-10 mb-4">
                        <span className="text-white font-bold text-sm">{milestone.year}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center max-w-[200px]">
                        <h4 className="font-bold text-lg mb-2 text-gray-900">{milestone.title}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Timeline - Vertical */}
            <div className="md:hidden space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-4">
                  {/* Timeline Line & Dot */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center shadow-lg z-10">
                      <span className="text-white font-bold text-xs">{milestone.year}</span>
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="w-1 h-full bg-green-200 mt-2"></div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <h4 className="font-bold text-lg mb-2 text-gray-900">{milestone.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

