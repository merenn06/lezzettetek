export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createYurticiShipmentForOrder } from "@/lib/shipping/yurtici";

type RequestBody = {
  orderId?: string;
};

/**
 * Admin wrapper for Yurtiçi Kargo create endpoint
 * Uses the shared createYurticiShipmentForOrder function
 */
export async function POST(req: Request) {
  try {
    // TODO: Add admin session check here
    // For now, we trust that only admins can access /admin routes

    const body = (await req.json()) as RequestBody;
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Geçersiz veya eksik orderId" },
        { status: 400 }
      );
    }

    // Use shared function
    const result = await createYurticiShipmentForOrder(orderId);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error?.includes("Sipariş bulunamadı") ? 404 : 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        trackingNumber: result.trackingNumber,
        cargoKey: result.cargoKey,
        reused: result.reused,
        shipping_job_id: result.shipping_job_id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[admin-yurtici] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}

