export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as soap from "soap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestBody = {
  orderId?: string;
  cargoKey?: string;
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
    const { orderId, cargoKey: providedCargoKey } = body;

    if (!orderId && !providedCargoKey) {
      return NextResponse.json(
        { ok: false, error: "orderId veya cargoKey gerekli" },
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
      console.error("[yurtici-cancel] Missing required environment variables");
      return NextResponse.json(
        { ok: false, error: "Sunucu yapılandırması eksik (env değişkenleri)" },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    let cargoKey: string | null = null;

    // If cargoKey provided directly, use it; otherwise fetch from order
    if (providedCargoKey) {
      cargoKey = providedCargoKey;
    } else if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("shipping_tracking_number")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("[yurtici-cancel] Order fetch error:", orderError);
        return NextResponse.json(
          { ok: false, error: "Sipariş bulunamadı" },
          { status: 404 }
        );
      }

      cargoKey = order.shipping_tracking_number as string | null;
      if (!cargoKey) {
        return NextResponse.json(
          { ok: false, error: "Bu sipariş için kargo takip numarası bulunamadı" },
          { status: 400 }
        );
      }
    }

    if (!cargoKey) {
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
      console.error("[yurtici-cancel] Failed to create SOAP client:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi servisine bağlanırken hata oluştu" },
        { status: 500 }
      );
    }

    // Call cancelShipment
    const soapPayload = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      userLanguage,
      cargoKeys: [cargoKey],
    };

    let result: any;
    try {
      const [soapResult] = await client.cancelShipmentAsync(soapPayload);
      result = soapResult;
    } catch (err: any) {
      console.error("[yurtici-cancel] cancelShipment SOAP error:", err);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi kargo iptal isteği başarısız: ${err?.message || "Bilinmeyen hata"}` },
        { status: 502 }
      );
    }

    // Parse response (similar structure to createShipment)
    if (result.outFlag !== "0") {
      const errorMsg = result.outResult || "Bilinmeyen hata";
      console.error("[yurtici-cancel] cancelShipment failed:", result);
      return NextResponse.json(
        { ok: false, error: `Yurtiçi hata: ${errorMsg}` },
        { status: 502 }
      );
    }

    // Update order status if orderId was provided
    if (orderId) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          shipping_status: "canceled",
          // Optionally also set status to 'canceled' if that's your business logic
          // status: "canceled",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("[yurtici-cancel] Failed to update order:", updateError);
        // Don't fail the request if DB update fails, cancellation was successful
      }
    }

    return NextResponse.json(
      { ok: true, cargoKey, message: "Kargo başarıyla iptal edildi" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[yurtici-cancel] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
