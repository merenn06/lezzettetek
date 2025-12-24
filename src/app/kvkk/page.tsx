import { KVKK_AYDINLATMA_METNI } from '@/data/legalTexts';
import { renderMarkdown } from '@/lib/markdown';
import Link from 'next/link';

export default function KvkkPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Ana Sayfaya Dön
        </Link>

        <div className="bg-white rounded-xl shadow-md p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Kişisel Verilerin Korunması Aydınlatma Metni (KVKK)
          </h1>
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed">
              {renderMarkdown(KVKK_AYDINLATMA_METNI)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
