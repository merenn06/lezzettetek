import * as soap from "soap";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateShipmentResult = {
  ok: boolean;
  trackingNumber?: string;
  cargoKey?: string;
  reused?: boolean;
  shipping_job_id?: number | null;
  error?: string;
};

/**
 * Fetches barcode/tracking number from Yurtiçi using listInvDocumentInterfaceByReference
 * Uses Report WSDL (WsReportWithReferenceServices) instead of ShippingOrderDispatcherServices
 * @param invoiceKey - The invoice key (cargoKey) to query - used as invCustIdArray
 * @param apiUser - API username
 * @param apiPass - API password
 * @param userLanguage - User language
 * @returns Object with orderSeq (barcode), docNumber, docId, labelUrl or null values
 */
export async function fetchOrderSeqFromYurtici(
  invoiceKey: string,
  apiUser: string,
  apiPass: string,
  userLanguage: string
): Promise<{
  orderSeq: string | null;
  docNumber: string | null;
  docId: string | null;
  labelUrl: string | null;
}> {
  let orderSeq: string | null = null;
  let docNumber: string | null = null;
  let docId: string | null = null;
  let labelUrl: string | null = null;

  try {
    // Log environment variables to verify they are being read
    console.log(`[yurtici-fetch-seq] Environment check:`);
    console.log(`[yurtici-fetch-seq] YURTICI_USER_GO exists: ${!!process.env.YURTICI_USER_GO}, value length: ${process.env.YURTICI_USER_GO?.length || 0}`);
    console.log(`[yurtici-fetch-seq] YURTICI_PASS_GO exists: ${!!process.env.YURTICI_PASS_GO}, value length: ${process.env.YURTICI_PASS_GO?.length || 0}`);
    console.log(`[yurtici-fetch-seq] YURTICI_LANG: ${process.env.YURTICI_LANG || "TR"}`);
    console.log(`[yurtici-fetch-seq] apiUser received: ${!!apiUser}, length: ${apiUser?.length || 0}`);
    console.log(`[yurtici-fetch-seq] apiPass received: ${!!apiPass}, length: ${apiPass?.length || 0}`);
    console.log(`[yurtici-fetch-seq] userLanguage: ${userLanguage}`);

    // Get Yurtiçi configuration
    const env = process.env.YURTICI_ENV || "test";
    const reportWsdlUrl =
      env === "live"
        ? process.env.YURTICI_REPORT_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl"
        : process.env.YURTICI_REPORT_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl";

    if (!reportWsdlUrl || !apiUser || !apiPass) {
      throw new Error(`Report WSDL URL veya API credentials eksik. WSDL: ${!!reportWsdlUrl}, User: ${!!apiUser}, Pass: ${!!apiPass}`);
    }

    console.log(`[yurtici-fetch-seq] Creating Report SOAP client for invoiceKey: ${invoiceKey}`);
    
    // Create SOAP client for Report service
    const client = await soap.createClientAsync(reportWsdlUrl);
    
    // Log client.describe() to check wrapper name if different
    try {
      const desc = client.describe();
      console.log(`[yurtici-fetch-seq] SOAP client describe() output:`, JSON.stringify(desc, null, 2));
    } catch (describeErr: any) {
      console.warn(`[yurtici-fetch-seq] Could not get client.describe():`, describeErr);
    }

    // Build payload - ONLY this format
    const payload = {
      ShippingDataRequestVO: {
        wsUserName: apiUser,
        wsPassword: apiPass,
        wsLanguage: userLanguage,
        invCustIdArray: { string: [invoiceKey] },
      },
    };

    console.log(`[yurtici-fetch-seq] Calling listInvDocumentInterfaceByReferenceAsync with payload:`, JSON.stringify(payload, null, 2));

    // Call method directly
    const [res] = await client.listInvDocumentInterfaceByReferenceAsync(payload);

    // Log raw response
    console.log(`[yurtici-fetch-seq] Raw response:`, JSON.stringify(res, null, 2));

    // Parse response - get ShippingDataResponseVO
    const vo = res?.ShippingDataResponseVO;

    if (!vo) {
      console.error(`[yurtici-fetch-seq] ShippingDataResponseVO not found in response, response keys:`, Object.keys(res || {}));
      return { orderSeq: null, docNumber: null, docId: null, labelUrl: null };
    }

    const outFlag = String(vo.outFlag ?? "");
    const outResult = String(vo.outResult ?? "");
    console.log(`[yurtici-fetch-seq] outFlag: ${outFlag}, outResult: ${outResult}`);

    // If outFlag !== "0", just log and return null (don't throw)
    if (outFlag !== "0") {
      console.log(`[yurtici-fetch-seq] outFlag is not "0", outResult: ${outResult}`);
      return { orderSeq: null, docNumber: null, docId: null, labelUrl: null };
    }

    // Extract barcodeStringValue from documentDetailVO
    const docDetails = Array.isArray(vo.documentDetailVO) 
      ? vo.documentDetailVO 
      : vo.documentDetailVO 
        ? [vo.documentDetailVO] 
        : [];

    if (docDetails.length > 0) {
      const docDetail = docDetails[0];
      orderSeq = docDetail?.barcodeStringValue ? String(docDetail.barcodeStringValue) : null;
      docNumber = docDetail?.DOC_NUMBER ? String(docDetail.DOC_NUMBER) : null;
      docId = docDetail?.DOC_ID ? String(docDetail.DOC_ID) : null;
      labelUrl = docDetail?.labelUrl ? String(docDetail.labelUrl) : null;
      
      console.log(`[yurtici-fetch-seq] Extracted - orderSeq: ${orderSeq}, DOC_NUMBER: ${docNumber}, DOC_ID: ${docId}, labelUrl: ${labelUrl}`);
    }
  } catch (listDocErr: any) {
    console.error(`[yurtici-fetch-seq] listInvDocumentInterfaceByReference error:`, listDocErr);
    throw listDocErr;
  }

  return { orderSeq, docNumber, docId, labelUrl };
}

/**
 * Generate idempotent cargoKey (20 chars max)
 * Format: "LT" + YYYYMMDD (from order date) + 6-digit (A-Z0-9 only)
 * Same orderId always produces same cargoKey (idempotent)
 */
function generateCargoKey(orderId: string, orderCreatedAt: string): string {
  const orderDate = new Date(orderCreatedAt);
  const yyyy = String(orderDate.getFullYear());
  const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
  const dd = String(orderDate.getDate()).padStart(2, "0");
  const datePrefix = `${yyyy}${mm}${dd}`; // YYYYMMDD = 8 chars
  
  // Generate 6-digit alphanumeric code (A-Z0-9 only) from orderId hash
  const hash = createHash("sha1").update(orderId).digest("hex");
  // Convert hex to alphanumeric (A-Z0-9 only)
  let alphanumeric = "";
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < hash.length && alphanumeric.length < 6; i += 2) {
    const hexByte = parseInt(hash.substring(i, i + 2), 16);
    alphanumeric += chars[hexByte % chars.length];
  }
  
  // Ensure exactly 6 characters
  const sixDigit = alphanumeric.substring(0, 6).padEnd(6, "0");
  
  // LT (2) + YYYYMMDD (8) + 6-digit (6) = 16 chars total (max 20)
  return `LT${datePrefix}${sixDigit}`;
}

function generateInvoiceKey(orderId: string, orderCreatedAt: string): string {
  return generateCargoKey(orderId, orderCreatedAt);
}

/**
 * Creates a Yurtiçi Kargo shipment for an order.
 * This function is idempotent - if shipment already exists, it returns early.
 * 
 * @param orderId - The order ID to create shipment for
 * @returns Result object with ok, trackingNumber, etc. or error
 */
export async function createYurticiShipmentForOrder(orderId: string): Promise<CreateShipmentResult> {
  try {
    console.log(`[shipping-auto] Creating shipment for order: ${orderId}`);

    const supabase = await createSupabaseServerClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`[shipping-auto] Order fetch error for ${orderId}:`, orderError);
      return {
        ok: false,
        error: "Sipariş bulunamadı",
      };
    }

    // Idempotency check: if shipment already created, skip
    if (
      order.shipping_tracking_number ||
      order.shipping_label_url ||
      order.shipping_status === "created"
    ) {
      console.log(`[shipping-auto] skipped - Order ${orderId} already has shipment (tracking: ${order.shipping_tracking_number}, status: ${order.shipping_status})`);
      return {
        ok: true,
        trackingNumber: order.shipping_tracking_number as string | undefined,
        cargoKey: (order.shipping_reference_number as string | undefined) || order.shipping_tracking_number as string | undefined,
        reused: true,
      };
    }

    // Business rule: only paid orders can be shipped
    const allowedStatuses = ["paid", "tamamlandi", "tamamlandı"];
    if (!allowedStatuses.includes(order.status)) {
      console.warn(`[shipping-auto] Order ${orderId} status is ${order.status}, not eligible for shipping`);
      return {
        ok: false,
        error: `Sadece ödenmiş siparişler kargoya verilebilir. Mevcut durum: ${order.status}`,
      };
    }

    // Get Yurtiçi configuration
    const env = process.env.YURTICI_ENV || "test";
    const wsdlUrl =
      env === "live"
        ? process.env.YURTICI_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl"
        : process.env.YURTICI_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl";
    const apiUser = process.env.YURTICI_USER_GO;
    const apiPass = process.env.YURTICI_PASS_GO;
    const userLanguage = process.env.YURTICI_LANG || "TR";

    if (!wsdlUrl || !apiUser || !apiPass) {
      console.error("[shipping-auto] Missing required Yurtiçi environment variables");
      const errorMsg = "Sunucu yapılandırması eksik (env değişkenleri)";
      
      // Update order with failure status
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: errorMsg,
        })
        .eq("id", orderId);

      return {
        ok: false,
        error: errorMsg,
      };
    }

    // Generate cargoKey and invoiceKey (idempotent)
    const cargoKey = generateCargoKey(orderId, order.created_at);
    const invoiceKey = generateInvoiceKey(orderId, order.created_at);

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
    } catch (err) {
      console.error(`[shipping-auto] Failed to create SOAP client for order ${orderId}:`, err);
      const errorMsg = "Yurtiçi servisine bağlanırken hata oluştu";
      
      // Update order with failure status
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: errorMsg,
        })
        .eq("id", orderId);

      return {
        ok: false,
        error: errorMsg,
      };
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

    // Call Yurtiçi API
    let result: any;
    try {
      const [soapResult] = await client.createShipmentAsync(soapPayload);
      result = soapResult;
    } catch (err: any) {
      console.error(`[shipping-auto] createShipment SOAP error for order ${orderId}:`, err);
      const errorMsg = `Yurtiçi kargo oluşturma isteği başarısız: ${err?.message || "Bilinmeyen hata"}`;
      
      // Update order with failure status
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: errorMsg,
        })
        .eq("id", orderId);

      return {
        ok: false,
        error: errorMsg,
      };
    }

    // Parse SOAP response (robust parsing for different response formats)
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
      console.error(`[shipping-auto] Missing ShippingOrderResultVO for order ${orderId}:`, raw);
      const errorMsg = "Yurtiçi yanıtı çözümlenemedi (ShippingOrderResultVO yok)";
      
      // Update order with failure status
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: errorMsg,
        })
        .eq("id", orderId);

      return {
        ok: false,
        error: errorMsg,
      };
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
    
    // Log vo keys and detail object for debugging
    console.log(`[shipping-auto] SOAP Response for order ${orderId}:`);
    console.log(`[shipping-auto] vo keys:`, vo ? Object.keys(vo) : 'vo is null');
    console.log(`[shipping-auto] vo object:`, JSON.stringify(vo, null, 2));
    console.log(`[shipping-auto] detail object:`, detail ? JSON.stringify(detail, null, 2) : 'detail is null');
    if (detail) {
      console.log(`[shipping-auto] detail keys:`, Object.keys(detail));
    }
    
    const errCode = detail ? Number(detail.errCode ?? 0) : 0;
    const errMessage = detail ? String(detail.errMessage ?? "") : String(outResult ?? "");

    // Check for success or idempotent success
    const isIdempotent = errCode === 60020 || /sistemde\s+mevcuttur/i.test(errMessage);
    const reused = isIdempotent || (outFlag === "0" && !detail);
    const success = outFlag === "0" || isIdempotent;

    if (!success) {
      const msg = `${outResult}${errCode ? ` (errCode:${errCode})` : ""}${errMessage ? ` - ${errMessage}` : ""}`;
      console.error(`[shipping-auto] failed - Order ${orderId} - outFlag: ${outFlag}, errCode: ${errCode}, errMessage: ${errMessage}`);
      
      const errorMsg = `Yurtiçi hata: ${msg}`;
      
      // Update order with failure status
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: errorMsg,
        })
        .eq("id", orderId);

      return {
        ok: false,
        error: errorMsg,
      };
    }

    let jobId = Number(vo.jobId ?? 0);
    if (jobId <= 0 && errMessage) {
      const m = errMessage.match(/(\d+)\s*talep\s*nolu/i);
      if (m?.[1]) jobId = Number(m[1]);
    }

    // Call listInvDocumentInterfaceByReference to get ORDER_SEQ (real tracking number)
    let orderSeq: string | null = null;
    let docNumber: string | null = null;
    let docId: string | null = null;
    let labelUrl: string | null = null;

    try {
      const result = await fetchOrderSeqFromYurtici(invoiceKey, apiUser, apiPass, userLanguage);
      orderSeq = result.orderSeq;
      docNumber = result.docNumber;
      docId = result.docId;
      labelUrl = result.labelUrl;
    } catch (listDocErr: any) {
      console.error(`[shipping-auto] listInvDocumentInterfaceByReference error for order ${orderId}:`, listDocErr);
      // Don't fail the shipment creation if this call fails, just log it
    }

    // Update order with shipment info
    const updateData: any = {
      shipping_carrier: "yurtici",
      shipping_reference_number: cargoKey, // Store cargoKey separately as reference number
      shipping_payment_type: "GONDERICI_ODEMELI",
      shipping_error_message: null, // Clear any previous error message
      // Note: shipped_at is not set here - it's set when actually shipped
    };

    // If ORDER_SEQ is available, use it as tracking number and set status to "created"
    // Otherwise, set status to "created_pending_barcode" and leave tracking_number as NULL
    const trackingNumber = orderSeq || undefined;
    
    if (orderSeq) {
      updateData.shipping_tracking_number = orderSeq;
      updateData.shipping_status = "created";
      
      // Set label URL if found
      if (labelUrl) {
        updateData.shipping_label_url = labelUrl;
      } else if (detail?.labelUrl || detail?.label_url || detail?.labelURL) {
        // Fallback to createShipment response label URL
        updateData.shipping_label_url = detail.labelUrl || detail.label_url || detail.labelURL;
      }
    } else {
      // ORDER_SEQ not available yet - set status to pending barcode
      updateData.shipping_tracking_number = null;
      updateData.shipping_status = "created_pending_barcode";
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error(`[shipping-auto] Failed to update order ${orderId} with shipment info:`, updateError);
      return {
        ok: false,
        error: "Kargo oluşturuldu ancak sipariş güncellemesi başarısız oldu",
        trackingNumber,
        cargoKey,
        reused,
        shipping_job_id: jobId > 0 ? jobId : null,
      };
    }

    console.log(`[shipping-auto] created - Order ${orderId} - Tracking: ${trackingNumber || 'NULL (pending barcode)'} (ORDER_SEQ: ${orderSeq || 'N/A'}), CargoKey: ${cargoKey}, reused: ${reused}, status: ${updateData.shipping_status}`);
    
    return {
      ok: true,
      trackingNumber,
      cargoKey,
      reused,
      shipping_job_id: jobId > 0 ? jobId : null,
    };
  } catch (err: any) {
    console.error(`[shipping-auto] Unexpected error for order ${orderId}:`, err);
    
    // Try to update order with failure status
    try {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from("orders")
        .update({
          shipping_status: "create_failed",
          shipping_error_message: err?.message || "Beklenmeyen bir hata oluştu",
        })
        .eq("id", orderId);
    } catch (updateErr) {
      console.error(`[shipping-auto] Failed to update error status for order ${orderId}:`, updateErr);
    }

    return {
      ok: false,
      error: err?.message || "Beklenmeyen bir hata oluştu",
    };
  }
}


