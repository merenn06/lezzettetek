import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
        <p className="text-gray-700 mb-8">
          Admin paneline hoş geldiniz. Buradan siparişleri, ürünleri ve site ayarlarını
          yönetebilirsiniz.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/siparisler"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer transition-all hover:shadow-md hover:border-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-green-50"
          >
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Siparişler</h2>
            <p className="text-gray-900 font-medium mb-2">Sipariş Yönetimi</p>
            <p className="text-xs text-gray-500">
              Son gelen siparişleri görüntüleyin ve durumlarını güncelleyin.
            </p>
          </Link>

          <Link
            href="/admin/urunler"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer transition-all hover:shadow-md hover:border-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-green-50"
          >
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Ürünler</h2>
            <p className="text-gray-900 font-medium mb-2">Ürün Yönetimi</p>
            <p className="text-xs text-gray-500">
              Yeni ürünler ekleyin, mevcut ürünleri düzenleyin veya kaldırın.
            </p>
          </Link>

          <Link
            href="/admin"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer transition-all hover:shadow-md hover:border-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-green-50"
          >
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Genel Ayarlar</h2>
            <p className="text-gray-900 font-medium mb-2">Site Ayarları</p>
            <p className="text-xs text-gray-500">
              İletişim bilgileri ve diğer yapılandırmaları buradan yönetebilirsiniz.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
