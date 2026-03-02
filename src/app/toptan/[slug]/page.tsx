import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";
import WholesaleDetailClient from "./WholesaleDetailClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function mapWholesaleRowToProduct(row: Record<string, unknown>): Product {
  const name = (row.name as string) ?? "";
  const description = (row.description as string) ?? "";
  const image_url = (row.image_url as string) ?? "";
  const total_weight =
    typeof row.total_weight === "string" && row.total_weight.trim()
      ? row.total_weight.trim()
      : null;
  const unit_price_text =
    typeof row.unit_price_text === "string" && row.unit_price_text.trim()
      ? row.unit_price_text.trim()
      : total_weight;
  const origin =
    typeof row.origin === "string" && row.origin.trim()
      ? row.origin.trim()
      : null;

  return {
    id: row.id as string,
    name,
    slug: row.slug as string,
    price: Number(row.price) || 0,
    compare_at_price: null,
    stock: 999999,
    description,
    image_url,
    image_url_2: null,
    unit_price_text: unit_price_text ?? null,
    content: null,
    origin,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
    is_wholesale: true,
  };
}

export const dynamic = "force-dynamic";

export default async function WholesaleProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!supabase) {
    return (
      <main className="min-h-screen bg-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-gray-700 mb-6">Ürün bilgisi alınamadı.</p>
          <Link
            href="/toptan-satis"
            className="inline-flex items-center text-green-700 hover:text-green-800 transition-colors font-semibold"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Toptan satışa dön
          </Link>
        </div>
      </main>
    );
  }

  const { data: row, error } = await supabase
    .from("wholesale_products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const product = mapWholesaleRowToProduct(row as Record<string, unknown>);

  return <WholesaleDetailClient product={product} />;
}
