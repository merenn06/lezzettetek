export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOrderSeqFromYurtici } from "@/lib/shipping/yurtici";

type RequestBody = {
  orderId?: string;
};

/**
 * Admin endpoint to refresh tracking number (ORDER_SEQ) from Yurtiçi
 * Only calls listInvDocumentInterfaceByReference, never calls createShipment
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Geçersiz veya eksik orderId" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("shipping_reference_number, shipping_tracking_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[yurtici-refresh-tracking] Order fetch error:", orderError);
      return NextResponse.json(
        { ok: false, error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Check if shipping_reference_number exists (required for invoiceKey)
    if (!order.shipping_reference_number) {
      return NextResponse.json(
        { ok: false, error: "Bu sipariş için referans numarası bulunamadı. Önce kargo oluşturulmalı." },
        { status: 400 }
      );
    }

    // Check if tracking number already exists and is valid (numeric ORDER_SEQ)
    const existing = order.shipping_tracking_number as string | null;
    if (existing) {
      const isNumeric = /^\d{8,20}$/.test(existing);
      if (isNumeric) {
        // Valid numeric ORDER_SEQ already exists, return it
        return NextResponse.json(
          {
            ok: true,
            trackingNumber: existing,
            message: "Takip numarası zaten mevcut",
          },
          { status: 200 }
        );
      }
      // Invalid tracking number (e.g., LT... cargoKey) - warn and refetch
      console.warn(`[yurtici-refresh-tracking] Existing tracking number is invalid (not numeric ORDER_SEQ), refetching. Existing value: ${existing.substring(0, 20)}...`);
    }

    // Get Yurtiçi configuration - standardize to USER_GO/PASS_GO/LANG
    const apiUser = process.env.YURTICI_USER_GO;
    const apiPass = process.env.YURTICI_PASS_GO;
    const userLanguage = process.env.YURTICI_LANG || "TR";

    // Log environment variables to verify they are being read
    console.log("[yurtici-refresh-tracking] Environment check:");
    console.log(`[yurtici-refresh-tracking] YURTICI_USER_GO exists: ${!!apiUser}, length: ${apiUser?.length || 0}`);
    console.log(`[yurtici-refresh-tracking] YURTICI_PASS_GO exists: ${!!apiPass}, length: ${apiPass?.length || 0}`);
    console.log(`[yurtici-refresh-tracking] YURTICI_LANG: ${userLanguage}`);

    if (!apiUser || !apiPass) {
      console.error("[yurtici-refresh-tracking] Missing required environment variables");
      console.error(`[yurtici-refresh-tracking] YURTICI_USER_GO: ${apiUser ? "SET" : "NOT SET"}`);
      console.error(`[yurtici-refresh-tracking] YURTICI_PASS_GO: ${apiPass ? "SET" : "NOT SET"}`);
      return NextResponse.json(
        { ok: false, error: "Sunucu yapılandırması eksik (env değişkenleri)" },
        { status: 500 }
      );
    }

    // Use shipping_reference_number as invoiceKey (they are the same in our implementation)
    const invoiceKey = order.shipping_reference_number as string;

    // Fetch ORDER_SEQ from Yurtiçi using Report WSDL with 3 retry attempts
    let orderSeq: string | null = null;
    let labelUrl: string | null = null;
    const maxAttempts = 3;
    const retryDelay = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[yurtici-refresh-tracking] Attempt ${attempt}/${maxAttempts} to fetch ORDER_SEQ for invoiceKey: ${invoiceKey}`);
        const result = await fetchOrderSeqFromYurtici(invoiceKey, apiUser, apiPass, userLanguage);
        orderSeq = result.orderSeq;
        labelUrl = result.labelUrl;

        if (orderSeq) {
          console.log(`[yurtici-refresh-tracking] Successfully fetched ORDER_SEQ on attempt ${attempt}/${maxAttempts}`);
          break; // Success, exit retry loop
        } else {
          console.log(`[yurtici-refresh-tracking] ORDER_SEQ not found on attempt ${attempt}/${maxAttempts}`);
          // If this is not the last attempt, wait before retrying
          if (attempt < maxAttempts) {
            console.log(`[yurtici-refresh-tracking] Waiting ${retryDelay / 1000} seconds before retry...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      } catch (fetchErr: any) {
        const errorMessage = fetchErr?.message || String(fetchErr || "");
        const errorLower = errorMessage.toLowerCase();
        
        // Check if it's an auth error (real error)
        if (errorLower.includes("auth") || 
            errorLower.includes("kullanıcı adı boş") || 
            errorLower.includes("şifre boş") ||
            errorLower.includes("kullanıcı adı boş olamaz") ||
            errorLower.includes("şifresi boş olamaz")) {
          console.error(`[yurtici-refresh-tracking] Auth error detected on attempt ${attempt}/${maxAttempts}:`, fetchErr);
          // Auth errors should return 500 immediately
          return NextResponse.json(
            { ok: false, error: `Kimlik doğrulama hatası: ${errorMessage}` },
            { status: 500 }
          );
        }
        
        console.error(`[yurtici-refresh-tracking] Failed to fetch ORDER_SEQ on attempt ${attempt}/${maxAttempts}:`, fetchErr);
        // If this is not the last attempt, wait before retrying
        if (attempt < maxAttempts) {
          console.log(`[yurtici-refresh-tracking] Waiting ${retryDelay / 1000} seconds before retry...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          // Last attempt failed, return error
          return NextResponse.json(
            { ok: false, error: `Takip numarası alınamadı: ${errorMessage}` },
            { status: 500 }
          );
        }
      }
    }

    if (!orderSeq) {
      console.log(`[yurtici-refresh-tracking] ORDER_SEQ not found after ${maxAttempts} attempts`);
      return NextResponse.json(
        { ok: false, error: "Kargo kaydı oluştu. Barkod/ORDER_SEQ şube kabulünden sonra üretilecektir. Lütfen daha sonra tekrar deneyin." },
        { status: 404 }
      );
    }

    // Log tracking number length (not the actual value for security)
    console.log(`[yurtici-refresh-tracking] Received ORDER_SEQ (barcodeStringValue) - length: ${orderSeq.length} characters`);

    // Update order with ORDER_SEQ
    const updateData: any = {
      shipping_tracking_number: orderSeq,
    };

    if (labelUrl) {
      updateData.shipping_label_url = labelUrl;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("[yurtici-refresh-tracking] Failed to update order:", updateError);
      return NextResponse.json(
        { ok: false, error: "Takip numarası alındı ancak veritabanı güncellemesi başarısız oldu" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        trackingNumber: orderSeq,
        message: "Takip numarası başarıyla güncellendi",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[yurtici-refresh-tracking] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}

