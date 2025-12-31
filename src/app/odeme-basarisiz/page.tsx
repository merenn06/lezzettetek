import Link from 'next/link';

export default async function OdemeBasarisizPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const orderId = params?.orderId;
  const reason = params?.reason;

  // Friendly error messages
  const getFriendlyReason = (reason?: string): string => {
    if (!reason) return 'Ödeme işlemi tamamlanamadı.';
    
    if (reason.includes('missing_token')) {
      return 'Ödeme bilgileri alınamadı. Lütfen tekrar deneyin.';
    }
    if (reason.includes('missing_order_id')) {
      return 'Sipariş bilgisi bulunamadı.';
    }
    if (reason.includes('api bilgileri')) {
      return 'Ödeme sistemi hatası. Lütfen daha sonra tekrar deneyin.';
    }
    if (reason.includes('sorgulanamadı')) {
      return 'Ödeme durumu kontrol edilemedi. Lütfen tekrar deneyin.';
    }
    
    return reason.length > 100 ? reason.substring(0, 100) + '...' : reason;
  };

  const friendlyReason = getFriendlyReason(reason);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-red-700"
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
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Ödeme Başarısız
            </h1>

            {/* Message */}
            <p className="text-lg text-gray-600 mb-6">
              {friendlyReason}
            </p>

            {/* Order ID */}
            {orderId && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2">Sipariş Numaranız:</p>
                <p className="text-xl font-mono font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg inline-block">
                  {orderId}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              {orderId ? (
                <Link
                  href={`/checkout?orderId=${encodeURIComponent(orderId)}`}
                  className="px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
                >
                  Tekrar Dene
                </Link>
              ) : (
                <Link
                  href="/checkout"
                  className="px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md"
                >
                  Tekrar Dene
                </Link>
              )}
              <Link
                href="/"
                className="px-8 py-4 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors"
              >
                Ana Sayfa
              </Link>
            </div>

            {/* Help Text */}
            <p className="text-sm text-gray-500 mt-8">
              Sorun devam ederse lütfen{' '}
              <Link href="/iletisim" className="text-green-700 hover:underline">
                iletişime geçin
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


