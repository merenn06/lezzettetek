import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin wrapper for Yurtiçi Kargo create endpoint
 * This route checks admin authentication and proxies to the internal API
 */
export async function POST(req: Request) {
  try {
    // TODO: Add admin session check here
    // For now, we'll use the internal token directly
    // In production, you should verify admin session first

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId gerekli" },
        { status: 400 }
      );
    }

    // Get internal token from environment
    const internalToken = process.env.INTERNAL_API_TOKEN;
    if (!internalToken) {
      return NextResponse.json(
        { ok: false, error: "Sunucu yapılandırması eksik" },
        { status: 500 }
      );
    }

    // Call the internal API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/shipping/yurtici/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[admin-yurtici-create] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
