export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as soap from "soap";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestBody = {
  orderId?: string;
};

/**
 * Generate idempotent cargoKey (20 chars max)
 * Format: "LT" + YYMMDD (from order date) + first 12 chars of SHA1 hash
 * Same orderId always produces same cargoKey (idempotent)
 */
function generateCargoKey(orderId: string, orderCreatedAt: string): string {
  // Use order creation date for idempotency
  const orderDate = new Date(orderCreatedAt);
  const yy = String(orderDate.getFullYear()).slice(-2);
  const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
  const dd = String(orderDate.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  // SHA1 hash of orderId, take first 12 chars (idempotent)
  const hash = createHash("sha1").update(orderId).digest("hex").substring(0, 12).toUpperCase();

  return `LT${datePrefix}${hash}`;
}

/**
 * Generate invoiceKey (same as cargoKey for simplicity, or can be different)
 */
function generateInvoiceKey(orderId: string, orderCreatedAt: string): string {
  return generateCargoKey(orderId, orderCreatedAt);
}

export async function POST(req: Request) {
  try {
    const internalToken = req.headers.get("x-internal-token");
    if (!internalToken || internalToken !== process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz istek" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as RequestBody;
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Geçersiz veya eksik orderId" },
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
      console.error("[yurtici] Missing required environment variables");
      return NextResponse.json(
        { ok: false, error: "Sunucu yapılandırması eksik (env değişkenleri)" },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("[yurtici] Order fetch error:", orderError);
      return NextResponse.json(
        { ok: false, error: "Sipariş bulunamadı veya getirilemedi" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Business rule: only paid orders can be shipped (or adjust based on your status values)
    const allowedStatuses = ["paid", "tamamlandi", "tamamlandı"];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: `Sadece ödenmiş siparişler kargoya verilebilir. Mevcut durum: ${order.status}` },
        { status: 400 }
      );
    }

    // Idempotency: if we already have a tracking number, return it directly
    if (order.shipping_tracking_number) {
      return NextResponse.json(
        {
          ok: true,
          trackingNumber: order.shipping_tracking_number as string,
          cargoKey: order.shipping_tracking_number as string,
          reused: true,
        },
        { status: 200 }
      );
    }

    // Generate cargoKey and invoiceKey (idempotent - same orderId always produces same key)
    const cargoKey = generateCargoKey(orderId, order.created_at);
    const invoiceKey = generateInvoiceKey(orderId, order.created_at);

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
    } catch (err) {
      console.error("[yurtici] Failed to create SOAP client:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi servisine bağlanırken hata oluştu" },
        { status: 500 }
      );
    }

    // Build SOAP payload according to Yurtiçi documentation
    const shippingOrderVO = {
      cargoKey,
      invoiceKey,
      receiverCustName: order.customer_name,
      receiverAddress: order.address,
      cityName: order.city,
      townName: order.district,
      receiverPhone1: order.phone,
      cargoCount: 1,
    };

    const soapPayload = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      userLanguage,
      ShippingOrderVO: [shippingOrderVO],
    };

    let result: any;
    try {
      const [soapResult] = await client.createShipmentAsync(soapPayload);
      result = soapResult;
    } catch (err: any) {
      console.error("[yurtici] createShipment SOAP error:", err);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi kargo oluşturma isteği başarısız: ${err?.message || "Bilinmeyen hata"}` },
        { status: 502 }
      );
    }

    // Debug: log raw response
    console.log("[yurtici] createShipment raw:", JSON.stringify(result, null, 2));

    // Parse response according to Yurtiçi documentation
    // Response structure: { ShippingOrderResultVO: { outFlag, outResult, jobId }, shippingOrderDetailVO[] }
    const resultVO = result.ShippingOrderResultVO || result;
    const outFlag = resultVO.outFlag;

    // Handle shippingOrderDetailVO (can be object or array)
    let details: any[] = [];
    if (Array.isArray(result.shippingOrderDetailVO)) {
      details = result.shippingOrderDetailVO;
    } else if (result.shippingOrderDetailVO && typeof result.shippingOrderDetailVO === "object") {
      details = [result.shippingOrderDetailVO];
    }

    if (details.length === 0) {
      console.error("[yurtici] No shipping order details in response:", result);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi yanıtında sipariş detayı bulunamadı" },
        { status: 502 }
      );
    }

    const detail = details[0];
    const detailErrCode = detail.errCode;
    const detailErrMessage = detail.errMessage || "";

    // Check for idempotent success: outFlag === "1" but errCode === 60020 and errMessage contains "sistemde mevcuttur"
    const isIdempotentSuccess =
      outFlag === "1" &&
      detailErrCode === 60020 &&
      detailErrMessage.toLowerCase().includes("sistemde mevcuttur");

    // Success if outFlag === "0" OR idempotent success
    if (outFlag === "0" || isIdempotentSuccess) {
      // Extract JOB_ID from errMessage if present
      let shippingJobId: string | undefined;
      if (detailErrMessage) {
        const jobIdMatch = detailErrMessage.match(/(\d+)\s*talep nolu/i);
        if (jobIdMatch && jobIdMatch[1]) {
          shippingJobId = jobIdMatch[1];
        }
      }

      // Use detail.cargoKey as trackingNumber
      const trackingNumber = detail.cargoKey || cargoKey;

      // Update order with shipment info
      const updateData: any = {
        status: "shipped",
        shipping_carrier: "yurtici",
        shipping_payment_type: "GONDERICI_ODEMELI",
        shipping_tracking_number: trackingNumber,
        shipped_at: new Date().toISOString(),
        shipping_status: "created",
      };

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) {
        console.error("[yurtici] Failed to update order with shipment info:", updateError);
        return NextResponse.json(
          {
            ok: false,
            error: "Kargo oluşturuldu ancak sipariş güncellemesi başarısız oldu",
            trackingNumber,
            cargoKey: trackingNumber,
            ...(shippingJobId && { shipping_job_id: shippingJobId }),
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          trackingNumber,
          cargoKey: trackingNumber,
          reused: isIdempotentSuccess,
          ...(shippingJobId && { shipping_job_id: shippingJobId }),
        },
        { status: 200 }
      );
    }

    // Error case: build detailed error message
    const errorParts: string[] = [];
    if (resultVO.outResult) errorParts.push(resultVO.outResult);
    if (detailErrCode !== undefined) errorParts.push(`errCode: ${detailErrCode}`);
    if (detailErrMessage) errorParts.push(detailErrMessage);
    const errorMsg = errorParts.length > 0 ? errorParts.join(" - ") : "Yurtiçi hata oluştu";

    console.error("[yurtici] createShipment failed:", result);
    return NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("[yurtici] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}

