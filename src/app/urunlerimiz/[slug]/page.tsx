import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/types/product';
import { getProductReviews } from '@/lib/reviews/actions';
import { generateProductSchema } from '@/lib/seo/productSchema';
import ProductDetailClient from './ProductDetailClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  if (!supabase) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-gray-700 mb-6">Ürün bilgisi alınamadı.</p>
          <Link
            href="/urunlerimiz"
            className="inline-flex items-center text-green-700 hover:text-green-800 transition-colors font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürün listesine dön
          </Link>
        </div>
      </main>
    );
  }

  // Fetch product
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !product) {
    notFound();
  }

  // Fetch reviews for schema
  const { reviews, stats } = await getProductReviews(product.id, 10);

  // Generate JSON-LD schema
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lezzettetek.com';
  const schema = generateProductSchema({
    product: product as Product,
    reviews,
    stats,
    baseUrl,
  });

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ProductDetailClient product={product as Product} />
    </>
  );
}

