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

    const supabase = await createSupabaseServerClient();
    let actualCargoKey: string | null = null;

    // If cargoKey provided directly, use it; otherwise fetch from order
    if (cargoKey) {
      actualCargoKey = cargoKey;
    } else if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("shipping_reference_number, shipping_tracking_number")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("[yurtici-query] Order fetch error:", orderError);
        return NextResponse.json(
          { ok: false, error: "Sipariş bulunamadı" },
          { status: 404 }
        );
      }

      actualCargoKey = order.shipping_reference_number as string | null;
      if (!actualCargoKey) {
        return NextResponse.json(
          { ok: false, error: "Bu sipariş için kargo referans numarası bulunamadı" },
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

    // Debug: log raw response
    console.log("[yurtici-query] queryShipment raw:", JSON.stringify(result, null, 2));
    console.log("[yurtici-query] queryShipment raw keys:", Object.keys(result || {}));

    // Robust parsing: queryShipment response bazen farklı wrapper'larla gelir
    const raw = result;

    // Extract vo from different wrapper possibilities
    const vo =
      raw?.queryShipmentReturn ??
      raw?.queryShipmentResponse?.queryShipmentReturn ??
      raw?.queryShipmentResult?.queryShipmentReturn ??
      raw?.return?.queryShipmentReturn ??
      raw?.result?.queryShipmentReturn ??
      raw; // Fallback: use raw itself if it has outFlag

    if (!vo) {
      console.error("[yurtici-query] Missing queryShipmentReturn:", raw);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi yanıtı çözümlenemedi (queryShipmentReturn yok)" },
        { status: 502 }
      );
    }

    console.log("[yurtici-query] vo keys:", Object.keys(vo || {}));
    console.log("[yurtici-query] vo.outFlag:", vo.outFlag, "vo.outResult:", vo.outResult);

    // Extract outFlag and outResult from vo
    const outFlag = String(vo.outFlag ?? "");
    const outResult = String(vo.outResult ?? "");

    // Check for errors
    if (outFlag !== "0") {
      const errorMsg = outResult || "Bilinmeyen hata";
      console.error("[yurtici-query] queryShipment failed - outFlag:", outFlag, "outResult:", outResult);
      console.error("[yurtici-query] queryShipment failed raw:", JSON.stringify(raw, null, 2));
      return NextResponse.json(
        { ok: false, error: `Yurtiçi hata: ${errorMsg}` },
        { status: 502 }
      );
    }

    // Extract shippingDeliveryDetailVO from different variations
    const shippingDetailsRaw =
      vo?.shippingDeliveryDetailVO ??
      vo?.shippingDeliveryDetailVo ??
      vo?.shippingDeliveryDetailVos ??
      vo?.shippingDeliveryDetailVO?.shippingDeliveryDetailVO ??
      raw?.shippingDeliveryDetailVO ??
      raw?.shippingDeliveryDetailVo ??
      raw?.shippingDeliveryDetailVos ??
      [];

    const shippingDetails = Array.isArray(shippingDetailsRaw)
      ? shippingDetailsRaw
      : shippingDetailsRaw
        ? [shippingDetailsRaw]
        : [];

    if (!Array.isArray(shippingDetails) || shippingDetails.length === 0) {
      return NextResponse.json(
        { ok: true, cargoKey: actualCargoKey, status: "unknown", message: "Kargo bilgisi bulunamadı" },
        { status: 200 }
      );
    }

    const detail = shippingDetails[0];
    const operationStatus = detail.operationStatus || "";

    // Extract tracking/barcode number from detail if available
    const trackingNumber = 
      detail?.barcode ||
      detail?.barcodeNo ||
      detail?.shipmentNo ||
      detail?.shipmentNumber ||
      detail?.trackingNo ||
      detail?.trackingNumber ||
      detail?.waybillNo ||
      detail?.awbNo ||
      null;

    // Update order based on operation status
    if (orderId) {
      const updateData: any = {};

      if (operationStatus === "DLV") {
        updateData.shipping_status = "delivered";
        updateData.delivered_at = new Date().toISOString();
      } else {
        updateData.shipping_status = "in_transit";
      }

      // Update tracking number if found
      if (trackingNumber) {
        updateData.shipping_tracking_number = trackingNumber;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId);

        if (updateError) {
          console.error("[yurtici-query] Failed to update order:", updateError);
          // Don't fail the request
        }
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

