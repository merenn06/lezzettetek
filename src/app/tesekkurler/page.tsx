import Link from 'next/link';

export default async function TesekkurlerPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const params = await searchParams;
  const orderId = params?.orderId;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-green-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Teşekkürler!
            </h1>

            {/* Message */}
            <p className="text-lg text-gray-600 mb-6">
              Siparişiniz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.
            </p>

            {/* Order ID */}
            {orderId && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2">Sipariş Numaranız:</p>
                <p className="text-xl font-mono font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-lg inline-block">
                  {orderId}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/urunlerimiz"
                className="px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
              >
                Alışverişe Devam Et
              </Link>
              <Link
                href="/"
                className="px-8 py-4 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

