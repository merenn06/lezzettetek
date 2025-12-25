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
    console.log("[yurtici] createShipment raw keys:", Object.keys(result || {}));

    // createShipment çağrısından sonra gelen "result" için robust parse yap.
    // SOAP response bazen farklı wrapper'larla gelir.
    const raw = result;

    // 1) ShippingOrderResultVO'yu farklı wrapper ihtimallerinden yakala
    const vo =
      raw?.ShippingOrderResultVO ??
      raw?.createShipmentReturn?.ShippingOrderResultVO ??
      raw?.createShipmentResponse?.ShippingOrderResultVO ??
      raw?.createShipmentResult?.ShippingOrderResultVO ??
      raw?.return?.ShippingOrderResultVO ??
      raw?.result?.ShippingOrderResultVO ??
      raw; // Fallback: use raw itself if it has outFlag

    if (!vo) {
      console.error("[yurtici] Missing ShippingOrderResultVO:", raw);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi yanıtı çözümlenemedi (ShippingOrderResultVO yok)" },
        { status: 502 }
      );
    }

    console.log("[yurtici] vo keys:", Object.keys(vo || {}));
    console.log("[yurtici] vo.outFlag:", vo.outFlag, "vo.outResult:", vo.outResult);

    // 2) Extract basic fields from vo
    const outFlag = String(vo.outFlag ?? "");
    const outResult = String(vo.outResult ?? "");

    // 3) Detayı her formda normalize et (array / object / nested) - NOT MANDATORY
    const detailRaw =
      vo?.shippingOrderDetailVO ??
      vo?.shippingOrderDetailVo ??
      vo?.shippingOrderDetailVos ??
      vo?.shippingOrderDetailVO?.shippingOrderDetailVO; // bazı wsdl'lerde nested gelir

    const details = Array.isArray(detailRaw)
      ? detailRaw
      : detailRaw
        ? [detailRaw]
        : [];

    const detail = details.length > 0 ? details[0] : null;
    const errCode = detail ? Number(detail.errCode ?? 0) : 0;
    const errMessage = detail ? String(detail.errMessage ?? "") : String(outResult ?? "");

    console.log("[yurtici] detail:", detail ? JSON.stringify(detail, null, 2) : "null");
    console.log("[yurtici] errCode:", errCode, "errMessage:", errMessage);

    // 4) Success / idempotent success (60020) handling
    // success koşulu: outFlag === "0" OR errCode === 60020 OR errMessage includes "sistemde mevcuttur"
    const isIdempotent = errCode === 60020 || /sistemde\s+mevcuttur/i.test(errMessage);
    // reused: idempotent durumlar veya detail yoksa (zaten sistemde var demektir)
    const reused = isIdempotent || (outFlag === "0" && !detail);
    // success: outFlag === "0" VEYA idempotent durum
    const success = outFlag === "0" || isIdempotent;

    if (!success) {
      const msg = `${outResult}${errCode ? ` (errCode:${errCode})` : ""}${errMessage ? ` - ${errMessage}` : ""}`;
      console.error("[yurtici] createShipment failed - outFlag:", outFlag, "errCode:", errCode, "errMessage:", errMessage);
      return NextResponse.json({ ok: false, error: `Yurtiçi hata: ${msg}` }, { status: 400 });
    }

    // 5) tracking/cargoKey - fallback to cargoKey if detail missing
    const trackingNumber = String(detail?.cargoKey || cargoKey);

    // 6) jobId extraction - prefer vo.jobId if > 0, else extract from errMessage
    let jobId = Number(vo.jobId ?? 0);
    if (jobId <= 0 && errMessage) {
      const m = errMessage.match(/(\d+)\s*talep\s*nolu/i);
      if (m?.[1]) jobId = Number(m[1]);
    }

    // 6) DB update: shipping_tracking_number yaz
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
          reused,
          shipping_job_id: jobId > 0 ? jobId : null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        trackingNumber,
        cargoKey: trackingNumber,
        reused,
        shipping_job_id: jobId > 0 ? jobId : null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[yurtici] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}

