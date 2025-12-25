export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as soap from "soap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const internalToken = req.headers.get("x-internal-token");
    if (!internalToken || internalToken !== process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz istek" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cargoKey = searchParams.get("cargoKey");
    const orderId = searchParams.get("orderId");

    if (!cargoKey && !orderId) {
      return NextResponse.json(
        { ok: false, error: "cargoKey veya orderId gerekli" },
        { status: 400 }
      );
    }

    const env = process.env.YURTICI_ENV || "test";
    const wsdlUrl =
      env === "live"
        ? process.env.YURTICI_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl"
        : process.env.YURTICI_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl";
    const apiUser = process.env.YURTICI_USER_GO;
    const apiPass = process.env.YURTICI_PASS_GO;
    const userLanguage = process.env.YURTICI_LANG || "TR";

    if (!wsdlUrl || !apiUser || !apiPass) {
      console.error("[yurtici-query] Missing required environment variables");
      return NextResponse.json(
        { ok: false, error: "Sunucu yapılandırması eksik (env değişkenleri)" },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    let actualCargoKey: string | null = null;

    // If cargoKey provided directly, use it; otherwise fetch from order
    if (cargoKey) {
      actualCargoKey = cargoKey;
    } else if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("shipping_tracking_number")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("[yurtici-query] Order fetch error:", orderError);
        return NextResponse.json(
          { ok: false, error: "Sipariş bulunamadı" },
          { status: 404 }
        );
      }

      actualCargoKey = order.shipping_tracking_number as string | null;
      if (!actualCargoKey) {
        return NextResponse.json(
          { ok: false, error: "Bu sipariş için kargo takip numarası bulunamadı" },
          { status: 400 }
        );
      }
    }

    if (!actualCargoKey) {
      return NextResponse.json(
        { ok: false, error: "cargoKey bulunamadı" },
        { status: 400 }
      );
    }

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
    } catch (err) {
      console.error("[yurtici-query] Failed to create SOAP client:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi servisine bağlanırken hata oluştu" },
        { status: 500 }
      );
    }

    // Call queryShipment
    const soapPayload = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      wsLanguage: userLanguage,
      keys: [actualCargoKey],
      keyType: 0, // 0 = cargoKey, 1 = invoiceKey
      addHistoricalData: false,
      onlyTracking: false,
    };

    let result: any;
    try {
      const [soapResult] = await client.queryShipmentAsync(soapPayload);
      result = soapResult;
    } catch (err: any) {
      console.error("[yurtici-query] queryShipment SOAP error:", err);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi kargo sorgulama isteği başarısız: ${err?.message || "Bilinmeyen hata"}` },
        { status: 502 }
      );
    }

    // Parse response
    if (result.outFlag !== "0") {
      const errorMsg = result.outResult || "Bilinmeyen hata";
      console.error("[yurtici-query] queryShipment failed:", result);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi hata: ${errorMsg}` },
        { status: 502 }
      );
    }

    // Check shipping details
    const shippingDetails = result.shippingDeliveryDetailVO || [];
    if (!Array.isArray(shippingDetails) || shippingDetails.length === 0) {
      return NextResponse.json(
        { ok: true, cargoKey: actualCargoKey, status: "unknown", message: "Kargo bilgisi bulunamadı" },
        { status: 200 }
      );
    }

    const detail = shippingDetails[0];
    const operationStatus = detail.operationStatus || "";

    // If delivered (DLV), update order
    if (operationStatus === "DLV" && orderId) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          shipping_status: "delivered",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("[yurtici-query] Failed to update order as delivered:", updateError);
        // Don't fail the request
      }
    }

    return NextResponse.json(
      {
        ok: true,
        cargoKey: actualCargoKey,
        status: operationStatus,
        detail,
        message: operationStatus === "DLV" ? "Kargo teslim edildi" : `Kargo durumu: ${operationStatus}`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[yurtici-query] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}

