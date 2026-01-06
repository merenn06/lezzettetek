export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as soap from "soap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  YurticiOperationStatusCode,
  YURTICI_OPERATION_STATUS_MAP,
  normalizeYurticiQueryShipmentResponse,
} from "@/lib/shipping/yurtici";

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

    // Call queryShipment (ShippingOrderDispatcherServices)
    const soapPayload = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      wsLanguage: userLanguage,
      keyType: 0, // 0 = cargoKey, 1 = invoiceKey
      keys: [actualCargoKey],
      addHistoricalData: true,
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

    const normalized = normalizeYurticiQueryShipmentResponse(result, actualCargoKey);

    // Compact debug log without PII
    console.log(
      "[yurtici-query]",
      JSON.stringify(
        {
          cargoKey: normalized.cargoKey,
          statusCode: normalized.operationStatusCode,
          reasonId: normalized.reasonId,
          hasProblemReason: normalized.hasProblemReason,
          eventsCount: normalized.events.length,
        },
        null,
        0
      )
    );

    // Extract tracking/barcode number from raw detail if available
    const d = normalized.rawDetail || {};
    const trackingNumber =
      d?.barcode ||
      d?.barcodeNo ||
      d?.shipmentNo ||
      d?.shipmentNumber ||
      d?.trackingNo ||
      d?.trackingNumber ||
      d?.waybillNo ||
      d?.awbNo ||
      null;

    // Update order based on operation status
    if (orderId) {
      const updateData: any = {};
      const statusCode = normalized.operationStatusCode;
      const info = normalized.operationStatusInfo;

      if (statusCode === "DLV") {
        updateData.shipping_status = "delivered";
        updateData.delivered_at = new Date().toISOString();
      } else if (statusCode === "CNL" || statusCode === "ISC" || statusCode === "BI") {
        updateData.shipping_status = "canceled";
      } else if (statusCode === "IND" || statusCode === "ISR") {
        updateData.shipping_status = "in_transit";
      } else if (statusCode === "NOP") {
        updateData.shipping_status = "created_pending_pickup";
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

    const statusCode = normalized.operationStatusCode;
    const info = normalized.operationStatusInfo;

    // Build user-facing message
    let userMessage: string;
    if (statusCode === "DLV") {
      userMessage = "Kargo teslim edildi.";
    } else if (info) {
      userMessage = `Kargo durumu: ${info.name}`;
    } else {
      userMessage = "Kargo durumu alınamadı.";
    }

    // Include reasonDesc if present
    if (normalized.reasonDesc) {
      userMessage += ` - ${normalized.reasonDesc}`;
    }

    return NextResponse.json(
      {
        ok: true,
        cargoKey: actualCargoKey,
        statusCode,
        statusInfo: info,
        reasonId: normalized.reasonId,
        reasonDesc: normalized.reasonDesc,
        hasProblemReason: normalized.hasProblemReason,
        cargoEventExplanation: normalized.cargoEventExplanation,
        events: normalized.events,
        rawDetail: normalized.rawDetail,
        message: userMessage,
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

