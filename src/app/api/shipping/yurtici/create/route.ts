export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as soap from "soap";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canCreateShipment } from "@/lib/shipping/canCreateShipment";
import { fetchOrderSeqFromYurtici } from "@/lib/shipping/yurtici";
import { Order } from "@/types/orders";

/**
 * Generate 12-digit document ID for COD orders
 * Uses order.id to generate a deterministic 12-digit number
 * @param orderId - Order UUID
 * @returns 12-digit string (e.g., "123456789012")
 */
function generateDocumentId(orderId: string): string {
  // Create hash from order ID
  const hash = createHash("sha256").update(orderId).digest("hex");
  // Convert hex to decimal: take first 12 hex chars and convert to number, then pad
  // Use BigInt to handle large numbers
  const hexPrefix = hash.substring(0, 12);
  const num = BigInt(`0x${hexPrefix}`);
  // Convert to string and take last 12 digits (or pad if shorter)
  const numStr = num.toString();
  // Take last 12 digits or pad with zeros
  return numStr.slice(-12).padStart(12, "0");
}

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

/**
 * Formats amount as decimal with dot as decimal separator
 * @param amount - Amount as number or string
 * @returns Formatted number with dot (e.g., 439.95)
 */
function formatTryAmount(amount: number | string): number {
  // Normalize: handle string/number, replace comma with dot, parse to number
  const amountNum = Number.parseFloat(String(amount ?? "0").replace(",", "."));
  // Format with 2 decimals (dot format) and return as number
  return Number.parseFloat(amountNum.toFixed(2));
}

/**
 * Masks credentials for logging (PII protection)
 */
function maskCredential(cred: string | undefined): string {
  if (!cred || cred.length === 0) return 'NOT_SET';
  if (cred.length <= 4) return '****';
  return `${cred.substring(0, 2)}${'*'.repeat(cred.length - 4)}${cred.substring(cred.length - 2)}`;
}

/**
 * Escapes XML special characters
 */
function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sends RAW XML SOAP envelope for createShipment with uppercase COD fields
 * Used when node-soap object mapping doesn't preserve uppercase field names
 */
async function sendRawXmlShipmentRequest(
  wsdlUrl: string,
  apiUser: string,
  apiPass: string,
  userLanguage: string,
  shippingOrderVO: any
): Promise<any> {
  // Extract SOAP endpoint URL from WSDL URL
  const endpointUrl = wsdlUrl.replace('?wsdl', '').replace('/?wsdl', '');
  
  // Build ShippingOrderVO XML with uppercase COD fields
  let shippingOrderXml = `
    <cargoKey>${escapeXml(shippingOrderVO.cargoKey)}</cargoKey>
    <invoiceKey>${escapeXml(shippingOrderVO.invoiceKey)}</invoiceKey>
    <receiverCustName>${escapeXml(shippingOrderVO.receiverCustName)}</receiverCustName>
    <receiverAddress>${escapeXml(shippingOrderVO.receiverAddress)}</receiverAddress>
    <cityName>${escapeXml(shippingOrderVO.cityName)}</cityName>
    <townName>${escapeXml(shippingOrderVO.townName)}</townName>
    <receiverPhone1>${escapeXml(shippingOrderVO.receiverPhone1)}</receiverPhone1>
    <cargoCount>${shippingOrderVO.cargoCount || 1}</cargoCount>`;
  
  // Add COD fields with camelCase names (as per Yurtiçi documentation examples)
  // Word doc examples show: ttInvoiceAmount (camelCase, comma format: "45,35")
  // Field names should be WITHOUT namespace inside ShippingOrderVO
  if (shippingOrderVO.ttCollectionType !== undefined) {
    shippingOrderXml += `
    <ttCollectionType>${escapeXml(shippingOrderVO.ttCollectionType)}</ttCollectionType>`;
  }
  if (shippingOrderVO.ttInvoiceAmount) {
    // Amount in TR virgüllü format (e.g., "439,95")
    // Sadece camelCase (ttInvoiceAmount) - uppercase (TT_INVOICE_AMOUNT) kaldırıldı
    shippingOrderXml += `
    <ttInvoiceAmount>${escapeXml(shippingOrderVO.ttInvoiceAmount)}</ttInvoiceAmount>`;
    // .NET clients require ttInvoiceAmountSpecified when ttInvoiceAmount is used
    shippingOrderXml += `
    <ttInvoiceAmountSpecified>true</ttInvoiceAmountSpecified>`;
  }
  if (shippingOrderVO.ttDocumentId) {
    shippingOrderXml += `
    <ttDocumentId>${escapeXml(shippingOrderVO.ttDocumentId)}</ttDocumentId>`;
  }
  if (shippingOrderVO.ttDocumentSaveType !== undefined) {
    shippingOrderXml += `
    <ttDocumentSaveType>${escapeXml(shippingOrderVO.ttDocumentSaveType)}</ttDocumentSaveType>`;
  }
  if (shippingOrderVO.dcSelectedCredit) {
    shippingOrderXml += `
    <dcSelectedCredit>${escapeXml(shippingOrderVO.dcSelectedCredit)}</dcSelectedCredit>`;
  }
  if (shippingOrderVO.dcCreditRule) {
    shippingOrderXml += `
    <dcCreditRule>${escapeXml(shippingOrderVO.dcCreditRule)}</dcCreditRule>`;
  }
  
  // Build complete SOAP envelope
  // According to Yurtiçi documentation: namespace should be "http://yurticikargo.com.tr/ShippingOrderDispatcherServices"
  // Method name: createShipment (not dispatch)
  // Field names inside ShippingOrderVO should be camelCase without namespace (ttInvoiceAmount, not TT_INVOICE_AMOUNT)
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ship="http://yurticikargo.com.tr/ShippingOrderDispatcherServices">
  <soapenv:Header/>
  <soapenv:Body>
    <ship:createShipment>
      <wsUserName>${escapeXml(apiUser)}</wsUserName>
      <wsPassword>${escapeXml(apiPass)}</wsPassword>
      <userLanguage>${escapeXml(userLanguage)}</userLanguage>
      <ShippingOrderVO>
        ${shippingOrderXml.trim()}
      </ShippingOrderVO>
    </ship:createShipment>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log("[yurtici-soap-xml] RAW XML envelope (credentials masked):", 
    soapEnvelope.replace(/<wsUserName>([^<]+)<\/wsUserName>/, `<wsUserName>${maskCredential(apiUser)}</wsUserName>`)
                 .replace(/<wsPassword>([^<]+)<\/wsPassword>/, `<wsPassword>${maskCredential(apiPass)}</wsPassword>`));

  // Send RAW XML via fetch
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'createShipment',
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RAW XML request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const responseText = await response.text();
  console.log("[yurtici-soap-xml] RAW XML response:", responseText);

  // Parse SOAP response XML
  // Extract ShippingOrderResultVO from response (handle both with and without namespace)
  // Yurtiçi may use different namespaces in response (ship:, ws:, or none)
  const resultVoMatch = responseText.match(/<(?:ship:|ws:)?ShippingOrderResultVO[^>]*>([\s\S]*?)<\/(?:ship:|ws:)?ShippingOrderResultVO>/i);
  if (!resultVoMatch) {
    // Try to extract error information if available
    const errorMatch = responseText.match(/<(?:ship:|ws:)?errCode[^>]*>([^<]+)<\/(?:ship:|ws:)?errCode>/i);
    const errorMsgMatch = responseText.match(/<(?:ship:|ws:)?errMessage[^>]*>([^<]+)<\/(?:ship:|ws:)?errMessage>/i);
    if (errorMatch || errorMsgMatch) {
      const err: any = new Error(errorMsgMatch?.[1] || "Yurtiçi Kargo hatası");
      err.errCode = errorMatch?.[1]?.trim();
      err.errMessage = errorMsgMatch?.[1]?.trim();
      throw err;
    }
    throw new Error("Could not find ShippingOrderResultVO in RAW XML response");
  }

  const resultVoXml = resultVoMatch[1];
  
  // Extract key fields from XML (handle both with and without namespace)
  const extractXmlValue = (xml: string, tagName: string): string | null => {
    // Try with different namespace prefixes, then without
    const patterns = [
      new RegExp(`<(?:ship:|ws:)?${tagName}[^>]*>([^<]+)<\/(?:ship:|ws:)?${tagName}>`, 'i'),
      new RegExp(`<${tagName}[^>]*>([^<]+)<\/${tagName}>`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const outFlag = extractXmlValue(resultVoXml, 'outFlag') || '';
  const outResult = extractXmlValue(resultVoXml, 'outResult') || '';
  const errCode = extractXmlValue(resultVoXml, 'errCode');
  const errMessage = extractXmlValue(resultVoXml, 'errMessage');
  const trackingNumber = extractXmlValue(resultVoXml, 'trackingNumber') || extractXmlValue(resultVoXml, 'cargoKey');
  const jobId = extractXmlValue(resultVoXml, 'jobId');

  // If there's an error, throw it
  if (outFlag !== '0' || errCode) {
    const err: any = new Error(errMessage || outResult || "Yurtiçi Kargo hatası");
    err.errCode = errCode || outFlag;
    err.errMessage = errMessage || outResult;
    err.outFlag = outFlag;
    err.outResult = outResult;
    throw err;
  }

  // Return structure similar to node-soap response
  return {
    createShipmentReturn: {
      ShippingOrderResultVO: {
        outFlag,
        outResult,
        errCode: errCode || '',
        errMessage: errMessage || '',
        trackingNumber,
        jobId: jobId ? parseInt(jobId, 10) : 0,
      }
    }
  };
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

    const supabase = await createSupabaseServerClient();

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

    // Check if shipment can be created using canCreateShipment function
    if (!canCreateShipment(order as Order)) {
      return NextResponse.json(
        { ok: false, error: `Bu sipariş için kargo oluşturulamaz. Ödeme durumu veya sipariş durumu uygun değil.` },
        { status: 403 }
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

    // Generate cargoKey (idempotent)
    // invoiceKey is set to cargoKey (fatura bazlı - same as cargoKey)
    const cargoKey = generateCargoKey(orderId, order.created_at);
    const invoiceKey = cargoKey; // Fatura bazlı: invoiceKey = cargoKey (LT...)

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
      
      // Log client.describe() to check wrapper name and ShippingOrderVO structure
      try {
        const desc = client.describe();
        console.log(`[yurtici-create] SOAP client describe() output:`, JSON.stringify(desc, null, 2));
        
        // Try to find ShippingOrderVO structure in WSDL
        const services = desc?.ShippingOrderDispatcherServices || desc;
        console.log(`[yurtici-create] WSDL services structure:`, JSON.stringify(services, null, 2));
      } catch (describeErr: any) {
        console.warn(`[yurtici-create] Could not get client.describe():`, describeErr);
      }
    } catch (err) {
      console.error("[yurtici-create] Failed to create SOAP client:", err);
      return NextResponse.json(
        { ok: false, error: "Yurtiçi servisine bağlanırken hata oluştu" },
        { status: 500 }
      );
    }

    // Check if payment method is COD: 'cod' or 'kapida'
    const isCOD = order.payment_method === 'cod' || order.payment_method === 'kapida';
    
    // Build base ShippingOrderVO according to Yurtiçi documentation
    const baseVO: any = {
      cargoKey,
      invoiceKey,
      receiverCustName: order.customer_name,
      receiverAddress: order.address,
      cityName: order.city,
      townName: order.district,
      receiverPhone1: order.phone,
      cargoCount: 1,
    };

    let shippingOrderVO: any;

    // Add COD (Tahsilatlı Teslimat) fields if payment method is COD
    // Yurtiçi Kargo COD mapping according to documentation
    if (isCOD) {
      // Generate 12-digit document ID (use order.idx if available, otherwise generate)
      const documentId = (order as any).idx 
        ? String((order as any).idx).padStart(12, '0').substring(0, 12)
        : generateDocumentId(orderId);
      
      // Amount must be DOT format (xs:double) and NUMBER (e.g., 439.95)
      const ttInvoiceAmount = formatTryAmount(order.total_price ?? 0);
      
      const codVO: any = {
        ...baseVO,
        ttInvoiceAmount,
        ttInvoiceAmountSpecified: true,
        ttDocumentId: documentId,
        ttCollectionType: "1",
        ttDocumentSaveType: "0",
        dcSelectedCredit: String(process.env.YURTICI_DC_SELECTED_CREDIT || "5"),
        dcCreditRule: "1",
      };

      shippingOrderVO = codVO;
      
      // Debug log - COD fields net görünsün
      console.log(`[yurtici-create] COD fields for order ${orderId}:`, {
        ttInvoiceAmount: codVO.ttInvoiceAmount,
        ttInvoiceAmountSpecified: codVO.ttInvoiceAmountSpecified,
        ttDocumentId: codVO.ttDocumentId,
        ttCollectionType: codVO.ttCollectionType,
        ttDocumentSaveType: codVO.ttDocumentSaveType,
        dcSelectedCredit: codVO.dcSelectedCredit,
        dcCreditRule: codVO.dcCreditRule,
        note: "Kontrat gereği kredi kartı tahsilat - ttCollectionType=1, dcCreditRule=1",
      });
    } else {
      // Online payment: COD fields are NOT sent
      shippingOrderVO = baseVO;
    }

    // Mask credentials helper
    const maskCredential = (cred: string): string => {
      if (!cred || cred.length === 0) return 'NOT_SET';
      if (cred.length <= 4) return '****';
      return `${cred.substring(0, 2)}${'*'.repeat(cred.length - 4)}${cred.substring(cred.length - 2)}`;
    };
    
    const soapPayload = {
      wsUserName: apiUser,
      wsPassword: apiPass,
      userLanguage,
      ShippingOrderVO: [shippingOrderVO],
    };
    
    // Log payload with masked credentials
    const maskedPayload = {
      ...soapPayload,
      wsUserName: maskCredential(apiUser),
      wsPassword: maskCredential(apiPass),
    };
    console.log(`[yurtici-create] SOAP payload (credentials masked):`, JSON.stringify(maskedPayload, null, 2));
    
    // Final payload verification - check if COD fields are present
    if (isCOD) {
      console.log("[PAYLOAD-FINAL] COD fields in ShippingOrderVO:", {
        ttCollectionType: shippingOrderVO.ttCollectionType,
        dcSelectedCredit: shippingOrderVO.dcSelectedCredit,
        dcCreditRule: shippingOrderVO.dcCreditRule,
        ttInvoiceAmount: shippingOrderVO.ttInvoiceAmount,
        ttDocumentId: shippingOrderVO.ttDocumentId,
        ttDocumentSaveType: shippingOrderVO.ttDocumentSaveType,
        note: "Kontrat gereği kredi kartı tahsilat - ttCollectionType=1, dcCreditRule=1",
      });
      
      // Log full ShippingOrderVO structure for debugging
      console.log("[PAYLOAD-FINAL] Full ShippingOrderVO object:", JSON.stringify(shippingOrderVO, null, 2));
    }

    let result: any;
    
    // For COD orders, ALWAYS use RAW XML to ensure uppercase field names are preserved
    // node-soap object mapping doesn't preserve uppercase field names (TT_INVOICE_AMOUNT)
    if (isCOD) {
      console.log("[yurtici-soap-xml] COD order detected - using RAW XML directly (bypassing node-soap)");
      try {
        result = await sendRawXmlShipmentRequest(wsdlUrl, apiUser, apiPass, userLanguage, shippingOrderVO);
      } catch (rawXmlErr: any) {
        console.error("[yurtici] RAW XML shipment error:", rawXmlErr);
        
        // Check if it's a 82505 error (ttInvoiceAmount missing)
        if (rawXmlErr?.errCode === 82505 || rawXmlErr?.message?.includes('82505') || rawXmlErr?.message?.includes('ttInvoiceAmount')) {
          console.error("[yurtici] 82505 error in RAW XML - checking field names and values");
          console.error("[yurtici] shippingOrderVO COD fields:", {
            ttCollectionType: shippingOrderVO.ttCollectionType,
            dcSelectedCredit: shippingOrderVO.dcSelectedCredit,
            dcCreditRule: shippingOrderVO.dcCreditRule,
            ttInvoiceAmount: shippingOrderVO.ttInvoiceAmount,
            ttDocumentId: shippingOrderVO.ttDocumentId,
            ttDocumentSaveType: shippingOrderVO.ttDocumentSaveType,
          });
        }
        
        return NextResponse.json(
          { 
            ok: false, 
            error: `Yurtiçi kargo oluşturma isteği başarısız (RAW XML): ${rawXmlErr?.errMessage || rawXmlErr?.message || "Bilinmeyen hata"}`,
            errCode: rawXmlErr?.errCode,
            errMessage: rawXmlErr?.errMessage,
          },
          { status: 502 }
        );
      }
    } else {
      // For non-COD orders, use node-soap
      try {
        const [soapResult] = await client.createShipmentAsync(soapPayload);
        result = soapResult;
      } catch (err: any) {
        console.error("[yurtici] createShipment SOAP error:", err);
        return NextResponse.json(
          { 
            ok: false, 
            error: `Yurtiçi kargo oluşturma isteği başarısız: ${err?.errMessage || err?.message || "Bilinmeyen hata"}`,
            errCode: err?.errCode,
            errMessage: err?.errMessage,
          },
          { status: 502 }
        );
      }
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
    
    // Log full vo structure for COD orders to find documentType/documentId
    if (isCOD) {
      console.log(`[yurtici-create] COD Response - Full ShippingOrderResultVO for order ${orderId}:`, JSON.stringify(vo, null, 2));
    }

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
    
    // Log document info for COD orders from createShipment response
    if (isCOD && detail) {
      const detailDocId = detail?.docId || detail?.DOC_ID || detail?.documentId || null;
      const detailDocType = detail?.documentType || detail?.DOCUMENT_TYPE || detail?.docType || null;
      console.log(`[yurtici-create] COD Response - Document Info from createShipment detail for order ${orderId}:`);
      console.log(`  - docId: ${detailDocId || 'NOT_FOUND'}`);
      console.log(`  - documentType: ${detailDocType || 'NOT_FOUND'}`);
      console.log(`  - detail keys:`, detail ? Object.keys(detail) : 'detail is null');
    }

    // 4) Success / idempotent success (60020) handling
    // success koşulu: outFlag === "0" OR errCode === 60020 OR errMessage includes "sistemde mevcuttur"
    const isIdempotent = errCode === 60020 || /sistemde\s+mevcuttur/i.test(errMessage);
    // reused: idempotent durumlar veya detail yoksa (zaten sistemde var demektir)
    const reused = isIdempotent || (outFlag === "0" && !detail);
    // success: outFlag === "0" VEYA idempotent durum
    const success = outFlag === "0" || isIdempotent;

    if (!success) {
      const msg = `${outResult}${errCode ? ` (errCode:${errCode})` : ""}${errMessage ? ` - ${errMessage}` : ""}`;
      console.error("[yurtici-create] createShipment failed - outFlag:", outFlag, "errCode:", errCode, "errMessage:", errMessage);
      
      // Special handling for error code 82512: "Kontratınız kredi kartı tahsilat olarak tanımlı, nakit seçilemez"
      if (errCode === 82512) {
        return NextResponse.json(
          { 
            ok: false, 
            error: "Kontratınız kredi kartı tahsilat olarak tanımlı, nakit seçilemez",
            errorCode: 82512,
            errorType: "contract_restriction"
          }, 
          { status: 400 }
        );
      }
      
      return NextResponse.json({ ok: false, error: `Yurtiçi hata: ${msg}` }, { status: 400 });
    }

    // 5) jobId extraction - prefer vo.jobId if > 0, else extract from errMessage
    let jobId = Number(vo.jobId ?? 0);
    if (jobId <= 0 && errMessage) {
      const m = errMessage.match(/(\d+)\s*talep\s*nolu/i);
      if (m?.[1]) jobId = Number(m[1]);
    }

    // 6) Call listInvDocumentInterfaceByReference to get ORDER_SEQ (real tracking number)
    let orderSeq: string | null = null;
    let docNumber: string | null = null;
    let docId: string | null = null;
    let labelUrl: string | null = null;
    let codLabelDocumentId: string | null = null;
    let codLabelDocumentType: string | null = null;

    try {
      // Try to fetch ORDER_SEQ using cargoKey (LT...)
      // Tries both INVOICE_KEY and CARGO_KEY field names internally
      // Also fetches collection label document info for COD orders
      const result = await fetchOrderSeqFromYurtici(cargoKey, apiUser, apiPass, userLanguage);
      orderSeq = result.orderSeq;
      docNumber = result.docNumber;
      docId = result.docId;
      labelUrl = result.labelUrl;
      codLabelDocumentId = result.codLabelDocumentId || null;
      codLabelDocumentType = result.codLabelDocumentType || null;
      
      // Log collection document info for COD orders
      if (isCOD) {
        console.log(`[yurtici-create] COD Collection Document Info for order ${orderId}:`);
        console.log(`  - codLabelDocumentId: ${codLabelDocumentId || 'NOT_FOUND'}`);
        console.log(`  - codLabelDocumentType: ${codLabelDocumentType || 'NOT_FOUND'}`);
        console.log(`  - shipping docId: ${docId || 'NOT_FOUND'}`);
        console.log(`  - shipping docNumber: ${docNumber || 'NOT_FOUND'}`);
      }
    } catch (listDocErr: any) {
      console.error(`[yurtici-create] listInvDocumentInterfaceByReference error for order ${orderId}:`, listDocErr);
      // Don't fail the shipment creation if this call fails, just log it
    }

    // 7) DB update: shipping_tracking_number yaz
    const updateData: any = {
      status: "shipped",
      shipping_carrier: "yurtici",
      shipping_reference_number: cargoKey, // Store cargoKey separately as reference number
      shipped_at: new Date().toISOString(),
      // Note: shipping_payment_type (cash/card) is already set by admin or defaults to "cash" for COD orders
      // We don't override it here to preserve the admin's selection
    };

    // For COD orders, save collection document info for collection label printing
    if (isCOD) {
      // Save ttDocumentId (sent in createShipment) as fallback
      if (shippingOrderVO.ttDocumentId) {
        updateData.shipping_collection_document_id = shippingOrderVO.ttDocumentId;
      }
      
      // Save collection label document info from Yurtiçi response (if found)
      if (codLabelDocumentId) {
        updateData.cod_label_document_id = codLabelDocumentId;
      }
      if (codLabelDocumentType) {
        updateData.cod_label_document_type = codLabelDocumentType;
      }
      
      console.log(`[yurtici-create] COD Document Info for order ${orderId}:`);
      console.log(`  - ttDocumentId (sent): ${shippingOrderVO.ttDocumentId || 'N/A'}`);
      console.log(`  - codLabelDocumentId (from Yurtiçi): ${codLabelDocumentId || 'NOT_FOUND'}`);
      console.log(`  - codLabelDocumentType (from Yurtiçi): ${codLabelDocumentType || 'NOT_FOUND'}`);
    }

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
      console.error("[yurtici-create] Failed to update order with shipment info:", updateError);
      return NextResponse.json(
        {
          ok: false,
          error: "Kargo oluşturuldu ancak sipariş güncellemesi başarısız oldu",
          trackingNumber: trackingNumber || null,
          cargoKey,
          reused,
          shipping_job_id: jobId > 0 ? jobId : null,
        },
        { status: 500 }
      );
    }

    console.log(`[yurtici-create] created - Order ${orderId} - Tracking: ${trackingNumber || 'NULL (pending barcode)'} (ORDER_SEQ: ${orderSeq || 'N/A'}), CargoKey: ${cargoKey}, reused: ${reused}, status: ${updateData.shipping_status}`);
    
    // Log COD fields - net görünsün
    if (isCOD) {
      console.log("[YURTICI-COD-CHECK]", {
        ttCollectionType: shippingOrderVO.ttCollectionType,
        dcSelectedCredit: shippingOrderVO.dcSelectedCredit,
        dcCreditRule: shippingOrderVO.dcCreditRule,
        ttInvoiceAmount: shippingOrderVO.ttInvoiceAmount,
        ttDocumentId: shippingOrderVO.ttDocumentId,
        ttDocumentSaveType: shippingOrderVO.ttDocumentSaveType,
        note: "Kontrat gereği kredi kartı tahsilat - ttCollectionType=1, dcCreditRule=1",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        trackingNumber: trackingNumber || null, // ORDER_SEQ if available, null otherwise
        cargoKey, // LT... reference number
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

