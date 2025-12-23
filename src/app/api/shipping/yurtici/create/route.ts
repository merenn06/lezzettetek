import { NextResponse } from "next/server";
import soap from "soap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestBody = {
  orderId?: string;
};

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

    const wsdlUrl = process.env.YURTICI_WSDL_URL;
    const apiUser = process.env.YURTICI_API_USER;
    const apiPass = process.env.YURTICI_API_PASS;
    const customerCode = process.env.YURTICI_CUSTOMER_CODE;
    const departureUnitCode = process.env.YURTICI_DEPARTURE_UNIT_CODE;
    const departureUnitName = process.env.YURTICI_DEPARTURE_UNIT_NAME;

    if (!wsdlUrl || !apiUser || !apiPass || !customerCode || !departureUnitCode) {
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

    // Business rule: only paid orders can be shipped
    if (order.status !== "paid") {
      return NextResponse.json(
        { ok: false, error: "Sadece ödenmiş (paid) siparişler kargoya verilebilir" },
        { status: 400 }
      );
    }

    // Idempotency: if we already have a tracking number, return it directly
    if (order.shipping_tracking_number) {
      return NextResponse.json(
        {
          ok: true,
          trackingNumber: order.shipping_tracking_number as string,
          reused: true,
        },
        { status: 200 }
      );
    }

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

    const paymentType = "GONDERICI_ODEMELI";

    // TODO: Replace 'createShipment' and payload shape with actual values from Yurtiçi WSDL/dokümanına göre güncellenecek
    const soapPayload: any = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      customerCode,
      // Example fields – MUST be aligned with official Yurtiçi schema
      senderCustomerCode: customerCode,
      senderUnitCode: departureUnitCode,
      senderUnitName: departureUnitName,
      receiverName: order.customer_name,
      receiverAddress: order.address,
      receiverCityName: order.city,
      receiverTownName: order.district,
      receiverPhone1: order.phone,
      paymentType,
      cargoKey: orderId,
      senderReference: orderId,
    };

    let trackingNumber: string | null = null;

    try {
      // This is a placeholder call; method name and response parsing
      // MUST be updated based on Yurtiçi WSDL.
      const [result] = await client.createShipmentAsync(soapPayload);

      // TODO: Parse actual tracking / barcode field from result
      trackingNumber =
        result?.trackingNumber ||
        result?.out?.trackingNumber ||
        result?.out?.cargoKey ||
        null;

      if (!trackingNumber) {
        console.error("[yurtici] SOAP response did not contain tracking number", result);
        return NextResponse.json(
          { ok: false, error: "Yurtiçi yanıtında takip numarası bulunamadı (TODO: mapping)" },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error("[yurtici] createShipment SOAP error:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi kargo oluşturma isteği başarısız oldu" },
        { status: 502 }
      );
    }

    // Update order with shipment info
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        shipping_carrier: "yurtici",
        shipping_payment_type: paymentType,
        shipping_tracking_number: trackingNumber,
        shipped_at: new Date().toISOString(),
        shipping_status: "created",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[yurtici] Failed to update order with shipment info:", updateError);
      return NextResponse.json(
        {
          ok: false,
          error: "Kargo oluşturuldu ancak sipariş güncellemesi başarısız oldu",
          trackingNumber,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, trackingNumber, reused: false },
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

