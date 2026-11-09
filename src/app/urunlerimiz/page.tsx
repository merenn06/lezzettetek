import { Suspense } from 'react';
import UrunlerimizClient from './UrunlerimizClient';

export const dynamic = 'force-dynamic';

export default function UrunlerimizPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-white min-h-[50vh] flex items-center justify-center text-gray-600">
          Ürünler yükleniyor...
        </div>
      }
    >
      <UrunlerimizClient />
    </Suspense>
  );
}
