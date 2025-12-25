export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as soap from "soap";
import { createHash } from "crypto";

type RequestBody = {
  orderId?: string;
};

/**
 * Generate idempotent cargoKey (20 chars max)
 */
function generateCargoKey(orderId: string, orderCreatedAt: string): string {
  const orderDate = new Date(orderCreatedAt);
  const yy = String(orderDate.getFullYear()).slice(-2);
  const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
  const dd = String(orderDate.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;
  const hash = createHash("sha1").update(orderId).digest("hex").substring(0, 12).toUpperCase();
  return `LT${datePrefix}${hash}`;
}

function generateInvoiceKey(orderId: string, orderCreatedAt: string): string {
  return generateCargoKey(orderId, orderCreatedAt);
}

/**
 * Admin wrapper for Yurtiçi Kargo create endpoint
 * This route directly calls the internal logic (no need for internal token in admin context)
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

    const env = process.env.YURTICI_ENV || "test";
    const wsdlUrl =
      env === "live"
        ? process.env.YURTICI_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl"
        : process.env.YURTICI_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl";
    const apiUser = process.env.YURTICI_USER_GO;
    const apiPass = process.env.YURTICI_PASS_GO;
    const userLanguage = process.env.YURTICI_LANG || "TR";

    if (!wsdlUrl || !apiUser || !apiPass) {
      console.error("[admin-yurtici] Missing required environment variables");
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

    if (orderError || !order) {
      console.error("[admin-yurtici] Order fetch error:", orderError);
      return NextResponse.json(
        { ok: false, error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Business rule: only paid orders can be shipped
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

    // Generate cargoKey and invoiceKey
    const cargoKey = generateCargoKey(orderId, order.created_at);
    const invoiceKey = generateInvoiceKey(orderId, order.created_at);

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
    } catch (err) {
      console.error("[admin-yurtici] Failed to create SOAP client:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi servisine bağlanırken hata oluştu" },
        { status: 500 }
      );
    }

    // Build SOAP payload
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
      console.error("[admin-yurtici] createShipment SOAP error:", err);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi kargo oluşturma isteği başarısız: ${err?.message || "Bilinmeyen hata"}` },
        { status: 502 }
      );
    }

    // Debug: log raw response
    console.log("[admin-yurtici] createShipment raw:", JSON.stringify(result, null, 2));

    // Parse response (same logic as internal API)
    const raw = result;
    const vo =
      raw?.ShippingOrderResultVO ??
      raw?.createShipmentReturn?.ShippingOrderResultVO ??
      raw?.createShipmentResponse?.ShippingOrderResultVO ??
      raw?.createShipmentResult?.ShippingOrderResultVO ??
      raw?.return?.ShippingOrderResultVO ??
      raw?.result?.ShippingOrderResultVO ??
      raw;

    if (!vo) {
      console.error("[admin-yurtici] Missing ShippingOrderResultVO:", raw);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi yanıtı çözümlenemedi (ShippingOrderResultVO yok)" },
        { status: 502 }
      );
    }

    const outFlag = String(vo.outFlag ?? "");
    const outResult = String(vo.outResult ?? "");

    const detailRaw =
      vo?.shippingOrderDetailVO ??
      vo?.shippingOrderDetailVo ??
      vo?.shippingOrderDetailVos ??
      vo?.shippingOrderDetailVO?.shippingOrderDetailVO;

    const details = Array.isArray(detailRaw)
      ? detailRaw
      : detailRaw
        ? [detailRaw]
        : [];

    const detail = details.length > 0 ? details[0] : null;
    const errCode = detail ? Number(detail.errCode ?? 0) : 0;
    const errMessage = detail ? String(detail.errMessage ?? "") : String(outResult ?? "");

    const isIdempotent = errCode === 60020 || /sistemde\s+mevcuttur/i.test(errMessage);
    const reused = isIdempotent || (outFlag === "0" && !detail);
    const success = outFlag === "0" || isIdempotent;

    if (!success) {
      const msg = `${outResult}${errCode ? ` (errCode:${errCode})` : ""}${errMessage ? ` - ${errMessage}` : ""}`;
      console.error("[admin-yurtici] createShipment failed - outFlag:", outFlag, "errCode:", errCode, "errMessage:", errMessage);
      return NextResponse.json({ ok: false, error: `Yurtiçi hata: ${msg}` }, { status: 400 });
    }

    const trackingNumber = String(detail?.cargoKey || cargoKey);

    let jobId = Number(vo.jobId ?? 0);
    if (jobId <= 0 && errMessage) {
      const m = errMessage.match(/(\d+)\s*talep\s*nolu/i);
      if (m?.[1]) jobId = Number(m[1]);
    }

    // DB update
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
      console.error("[admin-yurtici] Failed to update order with shipment info:", updateError);
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
    console.error("[admin-yurtici] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
