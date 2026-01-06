import * as soap from "soap";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canCreateShipment } from "./canCreateShipment";
import { Order } from "@/types/orders";

/**
 * Masks credentials for logging (PII protection)
 * @param cred - Credential string to mask
 * @returns Masked credential string
 */
const maskCredential = (cred: string | undefined): string => {
  if (!cred || cred.length === 0) return 'NOT_SET';
  if (cred.length <= 4) return '****';
  return `${cred.substring(0, 2)}${'*'.repeat(cred.length - 4)}${cred.substring(cred.length - 2)}`;
};

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

export type CreateShipmentResult = {
  ok: boolean;
  trackingNumber?: string;
  cargoKey?: string;
  reused?: boolean;
  shipping_job_id?: number | null;
  error?: string;
};

// Yurtici queryShipment operation status codes (from technical doc)
export type YurticiOperationStatusCode = "NOP" | "IND" | "ISR" | "CNL" | "ISC" | "DLV" | "BI";

export type YurticiOperationStatusInfo = {
  code: YurticiOperationStatusCode;
  name: string;
  description: string;
  isFinal: boolean;
  isDelivered: boolean;
};

export const YURTICI_OPERATION_STATUS_MAP: Record<YurticiOperationStatusCode, YurticiOperationStatusInfo> =
  {
    NOP: {
      code: "NOP",
      name: "İşlem Yok",
      description: "Kargo işlem görmemiş.",
      isFinal: false,
      isDelivered: false,
    },
    IND: {
      code: "IND",
      name: "Teslimat Sürecinde",
      description: "Kargo teslimat sürecinde.",
      isFinal: false,
      isDelivered: false,
    },
    ISR: {
      code: "ISR",
      name: "İşlem Görmüş",
      description: "Kargo işlem görmüş, fatura kesilmemiş.",
      isFinal: false,
      isDelivered: false,
    },
    CNL: {
      code: "CNL",
      name: "Çıkışı Engellendi",
      description: "Kargo çıkışı engellenmiş.",
      isFinal: true,
      isDelivered: false,
    },
    ISC: {
      code: "ISC",
      name: "İptal Edilmiş",
      description: "Kargo daha önce iptal edilmiş.",
      isFinal: true,
      isDelivered: false,
    },
    DLV: {
      code: "DLV",
      name: "Teslim Edildi",
      description: "Kargo teslim edilmiş.",
      isFinal: true,
      isDelivered: true,
    },
    BI: {
      code: "BI",
      name: "Fatura İptal",
      description: "Fatura şube tarafından iptal edilmiş.",
      isFinal: true,
      isDelivered: false,
    },
  };

export type YurticiShipmentEvent = {
  eventId: string | null;
  eventName: string | null;
  eventDate: string | null;
  eventTime: string | null;
  cityName: string | null;
  townName: string | null;
  unitId: string | null;
  unitName: string | null;
  reasonId: string | null;
  reasonName: string | null;
  raw?: any;
};

export type YurticiQueryShipmentNormalized = {
  cargoKey: string;
  operationStatusCode: YurticiOperationStatusCode | null;
  operationStatusInfo: YurticiOperationStatusInfo | null;
  operationCode: string | null;
  operationMessage: string | null;
  reasonId: string | null;
  reasonDesc: string | null;
  hasProblemReason: boolean;
  cargoEventExplanation: string | null;
  events: YurticiShipmentEvent[];
  rawDetail: any;
};

/**
 * Fetches barcode/tracking number from Yurtiçi using listInvDocumentInterfaceByReference
 * Uses Report WSDL (WsReportWithReferenceServices) instead of ShippingOrderDispatcherServices
 * Tries both INVOICE_KEY and CARGO_KEY field names
 * @param cargoKey - The cargo key (LT...) to query
 * @param apiUser - API username
 * @param apiPass - API password
 * @param userLanguage - User language
 * @returns Object with orderSeq (barcode), docNumber, docId, labelUrl or null values
 */
export async function fetchOrderSeqFromYurtici(
  cargoKey: string,
  apiUser: string,
  apiPass: string,
  userLanguage: string
): Promise<{
  orderSeq: string | null;
  docNumber: string | null;
  docId: string | null;
  labelUrl: string | null;
  outResult?: string | null; // Yurtiçi API response message (e.g., "Kayıt bulunamadı")
  outFlag?: string | null;
  codLabelDocumentId?: string | null; // Collection label document ID
  codLabelDocumentType?: string | null; // Collection label document type
  reportDocumentTypes?: string[] | null; // All documentType values from report (for debugging)
  reportDocumentsSummary?: {
    documentType: string | null;
    docId: string | null;
    docNumber: string | null;
    fieldName: string | null;
    fieldValue: string | null;
  }[] | null; // Compact per-document summary (no PII)
}> {
  let orderSeq: string | null = null;
  let docNumber: string | null = null;
  let docId: string | null = null;
  let labelUrl: string | null = null;
  let outResult: string | null = null;
  let codLabelDocumentId: string | null = null;
  let codLabelDocumentType: string | null = null;
  let outFlagValue: string | null = null;
  const reportDocumentTypes: string[] = [];
  const reportDocumentsSummary: {
    documentType: string | null;
    docId: string | null;
    docNumber: string | null;
    fieldName: string | null;
    fieldValue: string | null;
  }[] = [];

  try {
    // Log environment variables to verify they are being read (masked credentials)
    console.log(`[yurtici-fetch-seq] Environment check:`);
    console.log(`[yurtici-fetch-seq] YURTICI_USER_GO: ${maskCredential(process.env.YURTICI_USER_GO)}`);
    console.log(`[yurtici-fetch-seq] YURTICI_PASS_GO: ${maskCredential(process.env.YURTICI_PASS_GO)}`);
    console.log(`[yurtici-fetch-seq] YURTICI_LANG: ${process.env.YURTICI_LANG || "TR"}`);
    console.log(`[yurtici-fetch-seq] apiUser: ${maskCredential(apiUser)}`);
    console.log(`[yurtici-fetch-seq] apiPass: ${maskCredential(apiPass)}`);
    console.log(`[yurtici-fetch-seq] userLanguage: ${userLanguage}`);

    // Get Yurtiçi configuration (REPORT WSDL - WsReportWithReferenceServices)
    const env = process.env.YURTICI_ENV || "test";
    const reportWsdlUrl =
      env === "live"
        ? process.env.YURTICI_REPORT_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl"
        : process.env.YURTICI_REPORT_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl";

    if (!reportWsdlUrl || !apiUser || !apiPass) {
      throw new Error(`Report WSDL URL veya API credentials eksik. WSDL: ${!!reportWsdlUrl}, User: ${!!apiUser}, Pass: ${!!apiPass}`);
    }

    console.log(`[yurtici-fetch-seq] Creating Report SOAP client for cargoKey: ${cargoKey}`);

    // Create SOAP client for Report service
    const client = await soap.createClientAsync(reportWsdlUrl);
    
    // Log client.describe() to check wrapper name if different
    try {
      const desc = client.describe();
      console.log(`[yurtici-fetch-seq] SOAP client describe() output:`, JSON.stringify(desc, null, 2));
    } catch (describeErr: any) {
      console.warn(`[yurtici-fetch-seq] Could not get client.describe():`, describeErr);
    }

    // Build payload according to WsReportWithReferenceServices WSDL:
    // root-level userName, password, language, fieldName, fieldValueArray
    // Try both INVOICE_KEY and CARGO_KEY field names
    const invCustId = process.env.YURTICI_INV_CUST_ID;
    
    const basePayloadTemplate = (fieldName: string) => {
      const payload: any = {
        userName: apiUser,
        password: apiPass,
        language: userLanguage,
        fieldName: fieldName,
      };
      
      // Optional real Yurtiçi customer code (NOT LT... cargoKey)
      if (invCustId) {
        payload.custParamsVO = {
          invCustIdArray: { string: [invCustId] },
        };
      }
      
      return payload;
    };

    // Try both INVOICE_KEY and CARGO_KEY, with both array formats
    const payloadVariants: Array<{ fieldName: string; payload: any }> = [];
    
    // INVOICE_KEY variants
    const invoiceBase = basePayloadTemplate("INVOICE_KEY");
    payloadVariants.push(
      { fieldName: "INVOICE_KEY", payload: { ...invoiceBase, fieldValueArray: [cargoKey] } },
      { fieldName: "INVOICE_KEY", payload: { ...invoiceBase, fieldValueArray: { string: [cargoKey] } } }
    );
    
    // CARGO_KEY variants
    const cargoBase = basePayloadTemplate("CARGO_KEY");
    payloadVariants.push(
      { fieldName: "CARGO_KEY", payload: { ...cargoBase, fieldValueArray: [cargoKey] } },
      { fieldName: "CARGO_KEY", payload: { ...cargoBase, fieldValueArray: { string: [cargoKey] } } }
    );

    let res: any = null;
    let lastError: any = null;

    let successfulVariantIndex: number | null = null;

    for (let i = 0; i < payloadVariants.length; i++) {
      const { fieldName, payload } = payloadVariants[i];
      try {
        // Mask credentials in log
        const maskedPayload = {
          ...payload,
          userName: maskCredential(payload.userName),
          password: maskCredential(payload.password),
        };
        
        console.log(
          `[yurtici-fetch-seq] Calling listInvDocumentInterfaceByReferenceAsync with payload variant ${
            i + 1
          }/${payloadVariants.length} (fieldName: ${fieldName}): ${JSON.stringify(maskedPayload)}`
        );

        const [soapRes] = await client.listInvDocumentInterfaceByReferenceAsync(payload);
        res = soapRes;

        const voVariant = soapRes?.ShippingDataResponseVO;
        const variantOutFlag = voVariant ? String(voVariant.outFlag ?? "") : "";
        const variantOutResult = voVariant ? String(voVariant.outResult ?? "") : "";

        console.log(
          `[yurtici-fetch-seq] Variant ${i + 1}/${payloadVariants.length} response (fieldName: ${fieldName}) - outFlag: ${variantOutFlag}, outResult: ${variantOutResult}`
        );

        if (res) {
          successfulVariantIndex = i;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.error(
          `[yurtici-fetch-seq] Error on payload variant ${i + 1}/${payloadVariants.length} (fieldName: ${fieldName}):`,
          err
        );
        if (i === payloadVariants.length - 1) {
          throw err;
        }
      }
    }

    if (!res) {
      throw lastError || new Error("Yurtiçi response alınamadı");
    }

    if (successfulVariantIndex != null) {
      console.log(
        `[yurtici-fetch-seq] Using response from payload variant ${
          successfulVariantIndex + 1
        }/${payloadVariants.length}`
      );
    }

    // Parse response - get ShippingDataResponseVO
    const vo = res?.ShippingDataResponseVO;

    if (!vo) {
      console.error(`[yurtici-fetch-seq] ShippingDataResponseVO not found in response, response keys:`, Object.keys(res || {}));
      return { orderSeq: null, docNumber: null, docId: null, labelUrl: null };
    }

    const outFlag = String(vo.outFlag ?? "");
    const outResult = String(vo.outResult ?? "");
    outFlagValue = outFlag;
    console.log(`[yurtici-fetch-seq] outFlag: ${outFlag}, outResult: ${outResult}`);

    // If outFlag !== "0", just log and return null with outResult (don't throw)
    if (outFlag !== "0") {
      console.log(`[yurtici-fetch-seq] outFlag is not "0", outResult: ${outResult}`);
      return { orderSeq: null, docNumber: null, docId: null, labelUrl: null, outResult, outFlag };
    }

    // Parse response according to WSDL: ShippingDataResponseVO.shippingDataV2DetailVOArray[]
    const detailsRaw = 
      vo?.shippingDataV2DetailVOArray ??
      vo?.shippingDataV2DetailVO ??
      vo?.shippingDataDetailVOArray ??
      vo?.shippingDataDetailVO ??
      vo?.documentDetailVO ??
      [];

    const docDetails = Array.isArray(detailsRaw) 
      ? detailsRaw 
      : detailsRaw 
        ? [detailsRaw] 
        : [];

    console.log(`[yurtici-fetch-seq] Found ${docDetails.length} detail record(s)`);

    if (docDetails.length > 0) {
      // Process all document details to find both shipping and collection documents
      for (const docDetail of docDetails) {
        // Extract document type
        const docType = docDetail?.documentType || docDetail?.DOCUMENT_TYPE || docDetail?.docType || null;
        const currentDocId = docDetail?.docId ? String(docDetail.docId) : null;
        const docCargoId = docDetail?.docCargoId ? String(docDetail.docCargoId) : null;
        const fieldName = docDetail?.fieldName ? String(docDetail.fieldName) : null;
        const fieldValue = docDetail?.fieldValue ? String(docDetail.fieldValue) : null;
        
        // Collect documentType list for debugging / admin UI
        if (docType) {
          reportDocumentTypes.push(String(docType));
        }

        // Collect compact per-document summary (no PII fields)
        reportDocumentsSummary.push({
          documentType: docType ? String(docType) : null,
          docId: currentDocId,
          docNumber:
            (docDetail?.docNumber ? String(docDetail.docNumber) : null) ??
            (docDetail?.DOC_NUMBER ? String(docDetail.DOC_NUMBER) : null),
          fieldName,
          fieldValue,
        });

        // Compact per-document debug log
        console.log("[yurtici-fetch-seq] docDetail summary:", {
          docType,
          docId: currentDocId,
          docCargoId,
          fieldName,
          fieldValue,
          orderSeqCandidate:
            docDetail?.ORDER_SEQ ??
            docDetail?.orderSeq ??
            docDetail?.barcodeStringValue ??
            docDetail?.waybillNo ??
            null,
          docNumber: docDetail?.docNumber ?? docDetail?.DOC_NUMBER ?? null,
        });
        
        // Check if this is a collection document (tahsilat etiketi)
        const isCollectionDoc = docType && (
          docType === "COLLECTION" ||
          docType === "PAYMENT" ||
          docType === "TAHSILAT" ||
          docType === "COD" ||
          /collection|payment|tahsilat|cod/i.test(String(docType))
        );
        
        if (isCollectionDoc && currentDocId) {
          codLabelDocumentId = currentDocId;
          codLabelDocumentType = String(docType);
          console.log(`[yurtici-fetch-seq] Found COLLECTION document - docId: ${codLabelDocumentId}, documentType: ${codLabelDocumentType}`);
        }
        
        // Extract shipping document (first one, or the one without collection type)
        if (!docId && currentDocId) {
          docId = currentDocId;
          
          // Try to find ORDER_SEQ in various fields
          orderSeq = 
            docDetail?.ORDER_SEQ ? String(docDetail.ORDER_SEQ) :
            docDetail?.orderSeq ? String(docDetail.orderSeq) :
            docDetail?.barcodeStringValue ? String(docDetail.barcodeStringValue) :
            (fieldName === "ORDER_SEQ" || fieldName === "orderSeq") ? fieldValue :
            docDetail?.waybillNo ? String(docDetail.waybillNo) :
            null;
          
          // Extract docNumber
          docNumber = 
            docDetail?.docNumber ? String(docDetail.docNumber) :
            docDetail?.DOC_NUMBER ? String(docDetail.DOC_NUMBER) :
            null;
          
          // Label URL if available
          labelUrl = 
            docDetail?.labelUrl ? String(docDetail.labelUrl) :
            docDetail?.labelURL ? String(docDetail.labelURL) :
            null;
        }
      }
      
      console.log(`[yurtici-fetch-seq] Extracted values:`);
      console.log(`  - orderSeq (ORDER_SEQ): ${orderSeq}`);
      console.log(`  - docNumber: ${docNumber}`);
      console.log(`  - docId (shipping): ${docId}`);
      console.log(`  - codLabelDocumentId: ${codLabelDocumentId}`);
      console.log(`  - codLabelDocumentType: ${codLabelDocumentType}`);
      console.log(`  - labelUrl: ${labelUrl}`);
    } else {
      console.log(`[yurtici-fetch-seq] No detail records found in response`);
    }
  } catch (listDocErr: any) {
    console.error(`[yurtici-fetch-seq] listInvDocumentInterfaceByReference error:`, listDocErr);
    throw listDocErr;
  }

  return { 
    orderSeq, 
    docNumber, 
    docId, 
    labelUrl, 
    outResult: outResult || null,
    outFlag: outFlagValue,
    codLabelDocumentId,
    codLabelDocumentType,
    reportDocumentTypes: reportDocumentTypes.length > 0 ? Array.from(new Set(reportDocumentTypes)) : null,
    reportDocumentsSummary:
      reportDocumentsSummary.length > 0 ? reportDocumentsSummary.slice(0, 50) : null,
  };
}

/**
 * Calls ShippingOrderDispatcherServices.queryShipment and returns normalized result.
 * Used by admin UI and internal flows that need latest shipment status.
 */
export async function queryYurticiShipment(
  cargoKey: string,
  apiUser: string,
  apiPass: string,
  userLanguage: string
): Promise<YurticiQueryShipmentNormalized> {
  const env = process.env.YURTICI_ENV || "test";
  const wsdlUrl =
    env === "live"
      ? process.env.YURTICI_WSDL_LIVE ||
        "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl"
      : process.env.YURTICI_WSDL_TEST ||
        "https://testws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl";

  if (!wsdlUrl || !apiUser || !apiPass) {
    throw new Error("Yurtiçi WSDL veya API kullanıcı bilgileri eksik");
  }

  let client: any;
  try {
    client = await soap.createClientAsync(wsdlUrl);
  } catch (err: any) {
    console.error("[yurtici-query-helper] Failed to create SOAP client:", err);
    throw err;
  }

  const payload = {
    wsUserName: apiUser,
    wsPassword: apiPass,
    wsLanguage: userLanguage,
    keyType: 0, // 0 = cargoKey, 1 = invoiceKey
    keys: [cargoKey],
    addHistoricalData: true,
    onlyTracking: false,
  };

  try {
    const [soapResult] = await client.queryShipmentAsync(payload);
    return normalizeYurticiQueryShipmentResponse(soapResult, cargoKey);
  } catch (err: any) {
    console.error("[yurtici-query-helper] queryShipment SOAP error:", err);
    throw err;
  }
}

/**
 * Normalizes queryShipment SOAP response into a typed structure.
 * Handles different wrapper variations and safely extracts key fields.
 */
export function normalizeYurticiQueryShipmentResponse(
  raw: any,
  cargoKey: string
): YurticiQueryShipmentNormalized {
  const fallback: YurticiQueryShipmentNormalized = {
    cargoKey,
    operationStatusCode: null,
    operationStatusInfo: null,
    operationCode: null,
    operationMessage: null,
    reasonId: null,
    reasonDesc: null,
    hasProblemReason: false,
    cargoEventExplanation: null,
    events: [],
    rawDetail: null,
  };

  if (!raw) return fallback;

  const vo =
    raw?.queryShipmentReturn ??
    raw?.queryShipmentResponse?.queryShipmentReturn ??
    raw?.queryShipmentResult?.queryShipmentReturn ??
    raw?.return?.queryShipmentReturn ??
    raw?.result?.queryShipmentReturn ??
    raw;

  if (!vo) {
    return fallback;
  }

  // Normalize detail array: shippingDeliveryDetailVO[ ]
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

  if (!shippingDetails.length) {
    return fallback;
  }

  const detail = shippingDetails[0] || {};

  // Extract operation status / code / message
  const operationStatusRaw =
    detail.operationStatus ||
    detail.OPERATION_STATUS ||
    vo.operationStatus ||
    vo.OPERATION_STATUS ||
    null;

  const operationStatusCode = operationStatusRaw
    ? String(operationStatusRaw)
    : null;

  const opStatusInfo =
    (operationStatusCode &&
      (YURTICI_OPERATION_STATUS_MAP as any)[operationStatusCode as YurticiOperationStatusCode]) ||
    null;

  const operationCodeRaw =
    detail.operationCode ||
    detail.OPERATION_CODE ||
    vo.operationCode ||
    vo.OPERATION_CODE ||
    null;

  const operationMessageRaw =
    detail.operationMessage ||
    detail.OPERATION_MESSAGE ||
    vo.operationMessage ||
    vo.OPERATION_MESSAGE ||
    vo.outResult ||
    null;

  const operationCode = operationCodeRaw ? String(operationCodeRaw) : null;
  const operationMessage = operationMessageRaw ? String(operationMessageRaw) : null;

  // Reason fields
  const reasonIdRaw =
    detail.reasonId ||
    detail.REASON_ID ||
    vo.reasonId ||
    vo.REASON_ID ||
    null;
  const reasonDescRaw =
    detail.reasonDesc ||
    detail.REASON_DESC ||
    vo.reasonDesc ||
    vo.REASON_DESC ||
    null;

  const reasonId = reasonIdRaw ? String(reasonIdRaw) : null;
  const reasonDesc = reasonDescRaw ? String(reasonDescRaw) : null;

  // Problem durumu: reasonId anlamlı bir sebep ise VEYA status CNL/ISC/BI ise
  const problemStatuses: YurticiOperationStatusCode[] = ["CNL", "ISC", "BI"];
  const hasProblemReason =
    (!!reasonId && reasonId.toUpperCase() !== "OK") ||
    (operationStatusCode != null &&
      problemStatuses.includes(operationStatusCode as YurticiOperationStatusCode));

  // cargoEventExplanation from detail or first event
  const cargoEventExplanationRaw =
    detail.cargoEventExplanation ||
    detail.CARGO_EVENT_EXPLANATION ||
    null;

  // Event history: invDocCargoVOArray (can be array, single object, or wrapper { invDocCargoVO: [...] })
  const eventsRaw =
    detail.invDocCargoVOArray ??
    detail.invDocCargoVO ??
    vo.invDocCargoVOArray ??
    vo.invDocCargoVO ??
    [];

  const rawEvents = eventsRaw as any;
  const eventsArray =
    Array.isArray(rawEvents)
      ? rawEvents
      : Array.isArray(rawEvents?.invDocCargoVO)
      ? rawEvents.invDocCargoVO
      : rawEvents?.invDocCargoVO
      ? [rawEvents.invDocCargoVO]
      : rawEvents
      ? [rawEvents]
      : [];

  const events: YurticiShipmentEvent[] = eventsArray.map((e: any) => {
    const eventId =
      e?.eventId || e?.EVENT_ID || e?.eventCode || e?.EVENT_CODE || null;
    const eventName =
      e?.eventName || e?.EVENT_NAME || e?.eventExplanation || e?.EVENT_EXPLANATION || null;
    const eventDate =
      e?.eventDate || e?.EVENT_DATE || null;
    const eventTime =
      e?.eventTime || e?.EVENT_TIME || null;
    const cityName =
      e?.cityName || e?.CITY_NAME || null;
    const townName =
      e?.townName || e?.TOWN_NAME || null;
    const unitId =
      e?.unitId || e?.UNIT_ID || null;
    const unitName =
      e?.unitName || e?.UNIT_NAME || null;
    const reasonIdEv =
      e?.reasonId || e?.REASON_ID || null;
    const reasonNameEv =
      e?.reasonName || e?.REASON_NAME || null;

    return {
      eventId: eventId ? String(eventId) : null,
      eventName: eventName ? String(eventName) : null,
      eventDate: eventDate ? String(eventDate) : null,
      eventTime: eventTime ? String(eventTime) : null,
      cityName: cityName ? String(cityName) : null,
      townName: townName ? String(townName) : null,
      unitId: unitId ? String(unitId) : null,
      unitName: unitName ? String(unitName) : null,
      reasonId: reasonIdEv ? String(reasonIdEv) : null,
      reasonName: reasonNameEv ? String(reasonNameEv) : null,
      raw: e,
    };
  });

  // Sort events chronologically when possible (by eventDate + eventTime).
  // Events with unparseable dates keep their relative order.
  const sortableEvents = events.map((ev, index) => {
    let ts: number | null = null;
    if (ev.eventDate) {
      // Try native Date.parse first
      const dateStr = ev.eventDate;
      const timeStr = ev.eventTime || "00:00:00";
      let isoCandidate = `${dateStr} ${timeStr}`;
      let parsed = Date.parse(isoCandidate);

      if (Number.isNaN(parsed)) {
        // Try DD.MM.YYYY format
        if (dateStr.includes(".")) {
          const parts = dateStr.split(".");
          if (parts.length === 3) {
            const [dd, mm, yyyy] = parts;
            isoCandidate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timeStr}`;
            parsed = Date.parse(isoCandidate);
          }
        }
      }

      if (!Number.isNaN(parsed)) {
        ts = parsed;
      }
    }

    return { ev, index, ts };
  });

  sortableEvents.sort((a, b) => {
    const aHasTs = a.ts != null;
    const bHasTs = b.ts != null;

    // If neither has timestamp, keep original order
    if (!aHasTs && !bHasTs) return a.index - b.index;
    // Items without timestamp go after those with timestamp
    if (aHasTs && !bHasTs) return -1;
    if (!aHasTs && bHasTs) return 1;
    // Both have timestamp - sort ascending (oldest -> newest)
    if ((a.ts as number) < (b.ts as number)) return -1;
    if ((a.ts as number) > (b.ts as number)) return 1;
    // Same timestamp - keep original order
    return a.index - b.index;
  });

  const sortedEvents = sortableEvents.map((s) => s.ev);

  return {
    cargoKey,
    operationStatusCode: operationStatusCode as YurticiOperationStatusCode | null,
    operationStatusInfo: opStatusInfo,
    operationCode,
    operationMessage,
    reasonId,
    reasonDesc,
    hasProblemReason,
    cargoEventExplanation: cargoEventExplanationRaw
      ? String(cargoEventExplanationRaw)
      : null,
    events: sortedEvents,
    rawDetail: detail,
  };
}

/**
 * Refreshes Yurtiçi COD status for an existing order by calling Report service
 * and updating COD-related columns on the orders table.
 *
 * This does NOT create a shipment; it only verifies whether a collection/COD
 * document exists for the given cargoKey and persists the result.
 */
export async function refreshYurticiCodStatus(
  order: any,
  supabaseClient: any,
  apiUser: string,
  apiPass: string,
  userLanguage: string
): Promise<void> {
  if (!order || !order.id) {
    console.warn("[yurtici-cod-refresh] Order or order.id missing, skipping COD refresh");
    return;
  }

  const orderId = String(order.id);
  const cargoKey =
    (order.shipping_reference_number as string | null) ||
    (order.shipping_tracking_number as string | null) ||
    null;

  if (!cargoKey) {
    console.warn(
      `[yurtici-cod-refresh] No cargoKey/shipping_reference_number for order ${orderId}, skipping COD refresh`
    );
    return;
  }

  if (!apiUser || !apiPass) {
    console.warn(
      `[yurtici-cod-refresh] Missing Yurtiçi API credentials, cannot refresh COD status for order ${orderId}`
    );
    return;
  }

  try {
    console.log(
      `[yurtici-cod-refresh] Refreshing COD status for order ${orderId}, cargoKey=${cargoKey}`
    );
    const result = await fetchOrderSeqFromYurtici(cargoKey, apiUser, apiPass, userLanguage);

    const codLabelDocumentId = result.codLabelDocumentId ?? null;
    const codLabelDocumentType = result.codLabelDocumentType ?? null;
    const reportDocumentTypes = result.reportDocumentTypes ?? null;
    const codConfirmed = !!codLabelDocumentId && !!codLabelDocumentType;

    const updateData: any = {
      yurtici_cod_doc_id: codLabelDocumentId,
      yurtici_cod_doc_type: codLabelDocumentType,
      yurtici_cod_confirmed: codConfirmed,
      yurtici_report_document_types: reportDocumentTypes,
    };

    const { error } = await supabaseClient
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error(
        `[yurtici-cod-refresh] Failed to update COD fields for order ${orderId}:`,
        error
      );
    }

    if (!codConfirmed) {
      console.warn(
        `[yurtici-cod-refresh] Collection doc not found for cargoKey=${cargoKey} on refresh. reportDocumentTypes=`,
        reportDocumentTypes
      );
    } else {
      console.log(
        `[yurtici-cod-refresh] COD confirmed for order ${orderId} with docId=${codLabelDocumentId}, docType=${codLabelDocumentType}`
      );
    }
  } catch (err: any) {
    console.error(
      `[yurtici-cod-refresh] Error while refreshing COD status for order ${orderId}:`,
      err
    );
  }
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
  shippingOrderVO: any,
  orderId: string
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
  
  // Add COD fields with UPPERCASE names
  if (shippingOrderVO.ttCollectionType !== undefined) {
    shippingOrderXml += `
    <TT_COLLECTION_TYPE>${escapeXml(shippingOrderVO.ttCollectionType)}</TT_COLLECTION_TYPE>`;
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
    <TT_DOCUMENT_ID>${escapeXml(shippingOrderVO.ttDocumentId)}</TT_DOCUMENT_ID>`;
  }
  if (shippingOrderVO.ttDocumentSaveType !== undefined) {
    shippingOrderXml += `
    <TT_DOCUMENT_SAVE_TYPE>${escapeXml(shippingOrderVO.ttDocumentSaveType)}</TT_DOCUMENT_SAVE_TYPE>`;
  }
  if (shippingOrderVO.dcSelectedCredit) {
    shippingOrderXml += `
    <DC_SELECTED_CREDIT>${escapeXml(shippingOrderVO.dcSelectedCredit)}</DC_SELECTED_CREDIT>`;
  }
  if (shippingOrderVO.dcCreditRule) {
    shippingOrderXml += `
    <DC_CREDIT_RULE>${escapeXml(shippingOrderVO.dcCreditRule)}</DC_CREDIT_RULE>`;
  }
  
  // Build complete SOAP envelope
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.yurticikargo.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:createShipment>
      <ws:wsUserName>${escapeXml(apiUser)}</ws:wsUserName>
      <ws:wsPassword>${escapeXml(apiPass)}</ws:wsPassword>
      <ws:userLanguage>${escapeXml(userLanguage)}</ws:userLanguage>
      <ws:ShippingOrderVO>
        ${shippingOrderXml.trim()}
      </ws:ShippingOrderVO>
    </ws:createShipment>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log("[yurtici-soap-xml] RAW XML envelope (credentials masked):", 
    soapEnvelope.replace(/<ws:wsUserName>([^<]+)<\/ws:wsUserName>/, `<ws:wsUserName>${maskCredential(apiUser)}</ws:wsUserName>`)
                 .replace(/<ws:wsPassword>([^<]+)<\/ws:wsPassword>/, `<ws:wsPassword>${maskCredential(apiPass)}</ws:wsPassword>`));

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
  // Extract ShippingOrderResultVO from response
  const resultVoMatch = responseText.match(/<ShippingOrderResultVO[^>]*>([\s\S]*?)<\/ShippingOrderResultVO>/);
  if (!resultVoMatch) {
    throw new Error("Could not find ShippingOrderResultVO in RAW XML response");
  }

  const resultVoXml = resultVoMatch[1];
  
  // Extract key fields from XML
  const extractXmlValue = (xml: string, tagName: string): string | null => {
    const match = xml.match(new RegExp(`<${tagName}[^>]*>([^<]+)<\/${tagName}>`, 'i'));
    return match ? match[1].trim() : null;
  };

  const outFlag = extractXmlValue(resultVoXml, 'outFlag') || '';
  const outResult = extractXmlValue(resultVoXml, 'outResult') || '';
  const errCode = extractXmlValue(resultVoXml, 'errCode');
  const errMessage = extractXmlValue(resultVoXml, 'errMessage');
  const trackingNumber = extractXmlValue(resultVoXml, 'trackingNumber') || extractXmlValue(resultVoXml, 'cargoKey');
  const jobId = extractXmlValue(resultVoXml, 'jobId');

  // Return structure similar to node-soap response
  return {
    createShipmentReturn: {
      ShippingOrderResultVO: {
        outFlag,
        outResult,
        errCode,
        errMessage,
        trackingNumber,
        jobId: jobId ? parseInt(jobId, 10) : 0,
      }
    }
  };
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

    // Get Yurtiçi configuration
    const env = process.env.YURTICI_ENV || "test";
    const wsdlUrl =
      env === "live"
        ? process.env.YURTICI_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl"
        : process.env.YURTICI_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices?wsdl";
    const userLanguage = process.env.YURTICI_LANG || "TR";

    // Choose WS credentials based on payment method (STRICT RULE)
    // COD orders (kapida/cod) -> MUST use TAHSILATLI profile
    // Non-COD orders -> use NORMAL profile (fallback to GO)
    const isCODOrder = order.payment_method === "cod" || order.payment_method === "kapida";

    let apiUser: string | undefined;
    let apiPass: string | undefined;
    let credentialProfile: "NORMAL" | "TAHSILATLI" = "NORMAL";

    if (isCODOrder) {
      // COD orders MUST use TAHSILATLI profile
      apiUser = process.env.YURTICI_USER_TAHSILATLI;
      apiPass = process.env.YURTICI_PASS_TAHSILATLI;
      credentialProfile = "TAHSILATLI";
    } else {
      // Non-COD orders -> use NORMAL profile (fallback to GO)
      apiUser = process.env.YURTICI_USER_NORMAL || process.env.YURTICI_USER_GO;
      apiPass = process.env.YURTICI_PASS_NORMAL || process.env.YURTICI_PASS_GO;
      credentialProfile = "NORMAL";
    }

    // Fallback safety for non-COD: if still missing, use GO creds
    if (!isCODOrder) {
      apiUser = apiUser || process.env.YURTICI_USER_GO;
      apiPass = apiPass || process.env.YURTICI_PASS_GO;
    }

    // Log which credential profile is used (masked)
    console.log("[yurtici-creds] Using credential profile:", {
      orderId,
      isCOD: isCODOrder,
      profile: credentialProfile,
      userMasked: apiUser ? maskCredential(apiUser) : null,
    });

    // STRICT VALIDATION: COD orders MUST use TAHSILATLI profile
    if (isCODOrder && credentialProfile !== "TAHSILATLI") {
      const errorMsg = `COD sipariş için TAHSILATLI credential profili zorunludur. Mevcut profil: ${credentialProfile}. YURTICI_USER_TAHSILATLI ve YURTICI_PASS_TAHSILATLI env değişkenlerini kontrol edin.`;
      console.error(`[yurtici-creds] ${errorMsg}`);
      
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

    // Idempotency check: if shipment already created, skip createShipment but allow COD refresh
    if (
      order.shipping_tracking_number ||
      order.shipping_label_url ||
      order.shipping_status === "created"
    ) {
      console.log(
        `[shipping-auto] skipped - Order ${orderId} already has shipment (tracking: ${order.shipping_tracking_number}, status: ${order.shipping_status})`
      );

      // If this is a COD order and COD debug fields are missing, refresh COD status from Report service
      const isCOD = order.payment_method === "cod" || order.payment_method === "kapida";
      const needsCodRefresh =
        isCOD &&
        (!order.yurtici_cod_doc_id ||
          !order.yurtici_cod_doc_type ||
          !order.yurtici_report_document_types ||
          (Array.isArray(order.yurtici_report_document_types) &&
            order.yurtici_report_document_types.length === 0));

      if (needsCodRefresh) {
        console.log(
          `[shipping-auto] COD shipment already exists but COD debug fields missing for order ${orderId}, refreshing COD status...`
        );
        await refreshYurticiCodStatus(order, supabase, apiUser || "", apiPass || "", userLanguage);
      }

      return {
        ok: true,
        trackingNumber: order.shipping_tracking_number as string | undefined,
        cargoKey:
          (order.shipping_reference_number as string | undefined) ||
          (order.shipping_tracking_number as string | undefined),
        reused: true,
      };
    }
    
    // Check if shipment can be created using canCreateShipment function
    if (!canCreateShipment(order as Order)) {
      console.warn(
        `[shipping-auto] Order ${orderId} is not eligible for shipping (payment_method: ${order.payment_method}, payment_status: ${order.payment_status}, status: ${order.status})`
      );
      return {
        ok: false,
        error: `Bu sipariş için kargo oluşturulamaz. Ödeme durumu veya sipariş durumu uygun değil.`,
      };
    }

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

    // Generate cargoKey (idempotent)
    // invoiceKey is set to cargoKey (fatura bazlı - same as cargoKey)
    const cargoKey = generateCargoKey(orderId, order.created_at);
    const invoiceKey = cargoKey; // Fatura bazlı: invoiceKey = cargoKey (LT...)

    // Field name mapping for COD fields (resolved from WSDL describe())
    let codInvoiceAmountField = "ttInvoiceAmount";
    let codInvoiceAmountSpecifiedField: string | null = "ttInvoiceAmountSpecified";
    let codDocumentIdField = "ttDocumentId";
    let codCollectionTypeField = "ttCollectionType";
    let codCollectionTypeSpecifiedField: string | null = "ttCollectionTypeSpecified";
    let codDocumentSaveTypeField = "ttDocumentSaveType";
    let codSelectedCreditField = "dcSelectedCredit";
    let codSelectedCreditSpecifiedField: string | null = "dcSelectedCreditSpecified";
    let codCreditRuleField = "dcCreditRule";
    let codCreditRuleSpecifiedField: string | null = "dcCreditRuleSpecified";

    // Build SOAP client
    let client: any;
    try {
      client = await soap.createClientAsync(wsdlUrl);
      
      // Log client.describe() to check wrapper name and ShippingOrderVO structure
      try {
        const desc = client.describe();
        console.log(`[shipping-auto] SOAP client describe() output for order ${orderId}:`, JSON.stringify(desc, null, 2));
        
        // Try to find ShippingOrderVO structure in WSDL and resolve actual field names
        const descStr = JSON.stringify(desc);

        // Invoice amount field (xs:double)
        const hasUpperInvoice = /TT_INVOICE_AMOUNT/.test(descStr);
        const hasCamelInvoice = /ttInvoiceAmount/.test(descStr);
        if (hasUpperInvoice && !hasCamelInvoice) {
          codInvoiceAmountField = "TT_INVOICE_AMOUNT";
        } else if (hasCamelInvoice) {
          codInvoiceAmountField = "ttInvoiceAmount";
        }

        // InvoiceAmountSpecified field (if exists)
        if (/TT_INVOICE_AMOUNT_SPECIFIED/.test(descStr)) {
          codInvoiceAmountSpecifiedField = "TT_INVOICE_AMOUNT_SPECIFIED";
        } else if (/ttInvoiceAmountSpecified/.test(descStr)) {
          codInvoiceAmountSpecifiedField = "ttInvoiceAmountSpecified";
        } else {
          codInvoiceAmountSpecifiedField = null;
        }

        // DocumentId field
        if (/TT_DOCUMENT_ID/.test(descStr) && !/ttDocumentId/.test(descStr)) {
          codDocumentIdField = "TT_DOCUMENT_ID";
        } else if (/ttDocumentId/.test(descStr)) {
          codDocumentIdField = "ttDocumentId";
        }

        // CollectionType field
        if (/TT_COLLECTION_TYPE/.test(descStr) && !/ttCollectionType/.test(descStr)) {
          codCollectionTypeField = "TT_COLLECTION_TYPE";
        } else if (/ttCollectionType/.test(descStr)) {
          codCollectionTypeField = "ttCollectionType";
        }

        // CollectionTypeSpecified field (if exists)
        if (/TT_COLLECTION_TYPE_SPECIFIED/.test(descStr)) {
          codCollectionTypeSpecifiedField = "TT_COLLECTION_TYPE_SPECIFIED";
        } else if (/ttCollectionTypeSpecified/.test(descStr)) {
          codCollectionTypeSpecifiedField = "ttCollectionTypeSpecified";
        } else {
          codCollectionTypeSpecifiedField = null;
        }

        // DocumentSaveType field
        if (/TT_DOCUMENT_SAVE_TYPE/.test(descStr) && !/ttDocumentSaveType/.test(descStr)) {
          codDocumentSaveTypeField = "TT_DOCUMENT_SAVE_TYPE";
        } else if (/ttDocumentSaveType/.test(descStr)) {
          codDocumentSaveTypeField = "ttDocumentSaveType";
        }

        // dcSelectedCredit field (usually camelCase)
        if (/DC_SELECTED_CREDIT/.test(descStr) && !/dcSelectedCredit/.test(descStr)) {
          codSelectedCreditField = "DC_SELECTED_CREDIT";
        } else if (/dcSelectedCredit/.test(descStr)) {
          codSelectedCreditField = "dcSelectedCredit";
        }

        // dcSelectedCreditSpecified field (if exists)
        if (/DC_SELECTED_CREDIT_SPECIFIED/.test(descStr)) {
          codSelectedCreditSpecifiedField = "DC_SELECTED_CREDIT_SPECIFIED";
        } else if (/dcSelectedCreditSpecified/.test(descStr)) {
          codSelectedCreditSpecifiedField = "dcSelectedCreditSpecified";
        } else {
          codSelectedCreditSpecifiedField = null;
        }

        // dcCreditRule field (usually camelCase)
        if (/DC_CREDIT_RULE/.test(descStr) && !/dcCreditRule/.test(descStr)) {
          codCreditRuleField = "DC_CREDIT_RULE";
        } else if (/dcCreditRule/.test(descStr)) {
          codCreditRuleField = "dcCreditRule";
        }

        // dcCreditRuleSpecified field (if exists)
        if (/DC_CREDIT_RULE_SPECIFIED/.test(descStr)) {
          codCreditRuleSpecifiedField = "DC_CREDIT_RULE_SPECIFIED";
        } else if (/dcCreditRuleSpecified/.test(descStr)) {
          codCreditRuleSpecifiedField = "dcCreditRuleSpecified";
        } else {
          codCreditRuleSpecifiedField = null;
        }

        console.log(`[shipping-auto] Resolved COD field names for order ${orderId}:`, {
          codInvoiceAmountField,
          codInvoiceAmountSpecifiedField,
          codDocumentIdField,
          codCollectionTypeField,
          codCollectionTypeSpecifiedField,
          codDocumentSaveTypeField,
          codSelectedCreditField,
          codSelectedCreditSpecifiedField,
          codCreditRuleField,
          codCreditRuleSpecifiedField,
        });
      } catch (describeErr: any) {
        console.warn(`[shipping-auto] Could not get client.describe() for order ${orderId}:`, describeErr);
      }
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

    // Check if payment method is COD: 'cod' or 'kapida'
    const isCOD = order.payment_method === "cod" || order.payment_method === "kapida";

    // Base ShippingOrderVO (non-COD fields, in correct WSDL order up to cargoCount)
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

    if (isCOD) {
      // COD: build a fresh VO in exact WSDL sequence:
      // ... cargoCount -> ttInvoiceAmount -> ttDocumentId -> ttCollectionType
      // -> ttDocumentSaveType -> dcSelectedCredit -> dcCreditRule ...

      // Generate 12-digit document ID (use order.idx if available, otherwise generate)
      const documentId =
        (order as any).idx
          ? String((order as any).idx).padStart(12, "0").substring(0, 12)
          : generateDocumentId(orderId);

      // Amount must be DOT format (xs:double) e.g. 439.95 (number)
      const ttInvoiceAmount = formatTryAmount(order.total_price ?? 0);

      const codVO: any = {
        ...baseVO,
      };

      // Map fields using names resolved from WSDL
      codVO[codInvoiceAmountField] = ttInvoiceAmount;
      if (codInvoiceAmountSpecifiedField) {
        codVO[codInvoiceAmountSpecifiedField] = true;
      }
      codVO[codDocumentIdField] = documentId;

      // Collection type mapping based on shipping_payment_type
      // cash => 0 (nakit), card => 1 (kredi kartı)
      // Default to "card" to match contract requirement if not explicitly set
      // TEMP HOTFIX: YURTICI_FORCE_COD_CASH=1 forces collectionType="0" and removes dc fields
      const forceCodCash = process.env.YURTICI_FORCE_COD_CASH === "1";
      const paymentType = (order.shipping_payment_type as "cash" | "card" | null) || "card";
      const collectionType = forceCodCash ? "0" : (paymentType === "card" ? "1" : "0");
      codVO[codCollectionTypeField] = collectionType;
      if (codCollectionTypeSpecifiedField) {
        codVO[codCollectionTypeSpecifiedField] = true;
      }
      codVO[codDocumentSaveTypeField] = "0";

      // If collectionType is credit card ("1") AND NOT forceCodCash, send dcSelectedCredit / dcCreditRule
      // TEMP HOTFIX: If forceCodCash is on, completely REMOVE dc fields from payload
      if (collectionType === "1" && !forceCodCash) {
        codVO[codSelectedCreditField] = String(process.env.YURTICI_DC_SELECTED_CREDIT || "5");
        codVO[codCreditRuleField] = "1";
        if (codSelectedCreditSpecifiedField) {
          codVO[codSelectedCreditSpecifiedField] = true;
        }
        if (codCreditRuleSpecifiedField) {
          codVO[codCreditRuleSpecifiedField] = true;
        }
      }
      // Note: If forceCodCash is on, dcSelectedCredit and dcCreditRule are NOT added to codVO at all

      shippingOrderVO = codVO;

      // Debug log - COD fields net görünsün
      console.log(`[yurtici-shipment] COD fields for order ${orderId}:`, {
        paymentType,
        forceCodCash,
        collectionType,
        codInvoiceAmountField,
        codInvoiceAmountSpecifiedField,
        codDocumentIdField,
        codCollectionTypeField,
        codCollectionTypeSpecifiedField,
        codDocumentSaveTypeField,
        codSelectedCreditField,
        codSelectedCreditSpecifiedField,
        codCreditRuleField,
        codCreditRuleSpecifiedField,
        ttInvoiceAmountValue: ttInvoiceAmount,
        vo: codVO,
        note: forceCodCash
          ? "TEMP HOTFIX: YURTICI_FORCE_COD_CASH=1 active. collectionType forced to '0', dc fields removed."
          : "COD field names resolved via WSDL describe(). Collection type derived from shipping_payment_type.",
      });
    } else {
      // Online payment: COD fields are NOT sent
      shippingOrderVO = baseVO;
    }

    // Build COD debug fields object (what we are sending), for DB persistence even on error
    const codDebugFields: any = {};
    if (isCOD) {
      codDebugFields.yurtici_tt_collection_type = String(
        shippingOrderVO[codCollectionTypeField] ?? ""
      ) || null;
      codDebugFields.yurtici_tt_document_id = String(
        shippingOrderVO[codDocumentIdField] ?? ""
      ) || null;

      const invAmountRawDebug = shippingOrderVO[codInvoiceAmountField];
      const invAmountNumDebug =
        typeof invAmountRawDebug === "number"
          ? invAmountRawDebug
          : invAmountRawDebug != null
          ? Number.parseFloat(String(invAmountRawDebug).replace(",", "."))
          : null;
      codDebugFields.yurtici_tt_invoice_amount =
        invAmountNumDebug != null && !Number.isNaN(invAmountNumDebug)
          ? invAmountNumDebug
          : null;

      codDebugFields.yurtici_tt_document_save_type = String(
        shippingOrderVO[codDocumentSaveTypeField] ?? ""
      ) || null;
      codDebugFields.yurtici_dc_credit_rule = String(
        shippingOrderVO[codCreditRuleField] ?? ""
      ) || null;
      codDebugFields.yurtici_dc_selected_credit = String(
        shippingOrderVO[codSelectedCreditField] ?? ""
      ) || null;
    }

    // Extra COD debugging: check keys and important field values on the VO
    if (isCOD) {
      console.log("[COD-VO-KEYS] ShippingOrderVO keys:", Object.keys(shippingOrderVO));
      console.log("[COD-VO-FIELDS]", {
        // Use conceptual names on the left; values come from resolved field names
        ttCollectionType: shippingOrderVO[codCollectionTypeField],
        ttCollectionTypeSpecified: codCollectionTypeSpecifiedField
          ? shippingOrderVO[codCollectionTypeSpecifiedField]
          : undefined,
        ttInvoiceAmount: shippingOrderVO[codInvoiceAmountField],
        ttInvoiceAmountSpecified: codInvoiceAmountSpecifiedField
          ? shippingOrderVO[codInvoiceAmountSpecifiedField]
          : undefined,
        dcSelectedCredit: shippingOrderVO[codSelectedCreditField],
        dcSelectedCreditSpecified: codSelectedCreditSpecifiedField
          ? shippingOrderVO[codSelectedCreditSpecifiedField]
          : undefined,
        dcCreditRule: shippingOrderVO[codCreditRuleField],
        dcCreditRuleSpecified: codCreditRuleSpecifiedField
          ? shippingOrderVO[codCreditRuleSpecifiedField]
          : undefined,
        ttDocumentId: shippingOrderVO[codDocumentIdField],
      });
    }

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
    console.log(`[shipping-auto] SOAP payload (credentials masked):`, JSON.stringify(maskedPayload, null, 2));
    
    // Final payload verification - check if COD fields are present (using resolved field names)
    if (isCOD) {
      console.log("[PAYLOAD-FINAL] COD fields in ShippingOrderVO (resolved names):", {
        [codInvoiceAmountField]: shippingOrderVO[codInvoiceAmountField],
        [codInvoiceAmountSpecifiedField || "ttInvoiceAmountSpecified"]:
          codInvoiceAmountSpecifiedField
            ? shippingOrderVO[codInvoiceAmountSpecifiedField]
            : undefined,
        [codDocumentIdField]: shippingOrderVO[codDocumentIdField],
        [codCollectionTypeField]: shippingOrderVO[codCollectionTypeField],
        [codCollectionTypeSpecifiedField || "ttCollectionTypeSpecified"]:
          codCollectionTypeSpecifiedField
            ? shippingOrderVO[codCollectionTypeSpecifiedField]
            : undefined,
        [codDocumentSaveTypeField]: shippingOrderVO[codDocumentSaveTypeField],
        [codSelectedCreditField]: shippingOrderVO[codSelectedCreditField],
        [codSelectedCreditSpecifiedField || "dcSelectedCreditSpecified"]:
          codSelectedCreditSpecifiedField
            ? shippingOrderVO[codSelectedCreditSpecifiedField]
            : undefined,
        [codCreditRuleField]: shippingOrderVO[codCreditRuleField],
        [codCreditRuleSpecifiedField || "dcCreditRuleSpecified"]:
          codCreditRuleSpecifiedField
            ? shippingOrderVO[codCreditRuleSpecifiedField]
            : undefined,
      });
      
      // Log full ShippingOrderVO structure for debugging
      console.log("[PAYLOAD-FINAL] Full ShippingOrderVO object:", JSON.stringify(shippingOrderVO, null, 2));
    }

    // Compact COD debug line (no PII) just before createShipment
    if (isCOD) {
      console.log(
        "[yurtici-shipment-debug]",
        JSON.stringify(
          {
            orderId,
            payment_method: order.payment_method,
            shipping_payment_type: order.shipping_payment_type,
            ttCollectionType: shippingOrderVO[codCollectionTypeField],
            dcSelectedCredit: shippingOrderVO[codSelectedCreditField],
            dcCreditRule: shippingOrderVO[codCreditRuleField],
            ttInvoiceAmount: shippingOrderVO[codInvoiceAmountField],
            ttDocumentId: shippingOrderVO[codDocumentIdField],
          },
          null,
          0
        )
      );
    }
    // Call Yurtiçi API
    let result: any;
    let useRawXml = false; // RAW XML fallback currently disabled
    
    try {
      const [soapResult] = await client.createShipmentAsync(soapPayload);
      result = soapResult;
      
      // Log SOAP XML request (after call, before error handling)
      if (client.lastRequest) {
        let xmlRequest = client.lastRequest;

        // Mask credentials in XML (handle both with and without namespace)
        xmlRequest = xmlRequest.replace(/<(?:ws:)?wsUserName[^>]*>([^<]+)<\/(?:ws:)?wsUserName>/g, (match: string, cred: string) => {
          return match.replace(cred, maskCredential(cred));
        });
        xmlRequest = xmlRequest.replace(/<(?:ws:)?wsPassword[^>]*>([^<]+)<\/(?:ws:)?wsPassword>/g, (match: string, cred: string) => {
          return match.replace(cred, maskCredential(cred));
        });

        // Basic PII mask for address / ad / email / telefon alanları
        xmlRequest = xmlRequest
          // address-like tags
          .replace(/<(receiverAddress|address|AddressTxt|senderAddressTxt|receiverAddressTxt)[^>]*>[^<]*<\/\1>/gi, (_m: string, tag: string) => {
            return `<${tag}>***</${tag}>`;
          })
          // name-like tags (customer/receiver names)
          .replace(/<(receiverCustName|senderCustName|custName|customerName)[^>]*>[^<]*<\/\1>/gi, (_m: string, tag: string) => {
            return `<${tag}>***</${tag}>`;
          })
          // email-like tags
          .replace(/<(emailAddress)[^>]*>[^<]*<\/emailAddress>/gi, "<emailAddress>***</emailAddress>")
          // phone/gsm tags
          .replace(/<(receiverPhone1|receiverPhone2|receiverPhone3|phone|mobilePhone|receiverMobilePhoneNumber|senderMobilePhoneNumber|receiverGsm|receiverPhone)[^>]*>[^<]*<\/\1>/gi, (_m: string, tag: string) => {
            return `<${tag}>***</${tag}>`;
          });

        console.log("[yurtici-soap-xml] lastRequest:", xmlRequest);

        // For COD orders, log COD field presence in XML
        if (isCOD) {
          const hasCamelTtInvoiceAmount = /<ttInvoiceAmount>[\s\S]*?<\/ttInvoiceAmount>/i.test(xmlRequest);
          const hasUpperTtInvoiceAmount = /<TT_INVOICE_AMOUNT>[\s\S]*?<\/TT_INVOICE_AMOUNT>/i.test(xmlRequest);
          const hasAnyTtInvoiceAmount = hasCamelTtInvoiceAmount || hasUpperTtInvoiceAmount;

          const hasTtCollectionType = /<ttCollectionType>[\s\S]*?<\/ttCollectionType>/i.test(xmlRequest);
          const hasDcSelectedCredit = /<dcSelectedCredit>[\s\S]*?<\/dcSelectedCredit>/i.test(xmlRequest);
          const hasDcCreditRule = /<dcCreditRule>[\s\S]*?<\/dcCreditRule>/i.test(xmlRequest);

          const invoiceValueMatch =
            xmlRequest.match(/<ttInvoiceAmount>([^<]+)<\/ttInvoiceAmount>/i) ||
            xmlRequest.match(/<TT_INVOICE_AMOUNT>([^<]+)<\/TT_INVOICE_AMOUNT>/i);
          const ttInvoiceAmountValue = invoiceValueMatch?.[1];

          console.log(
            `[COD-XML-CHECK] ttCollectionType=${hasTtCollectionType ? "VAR" : "YOK"}, dcSelectedCredit=${hasDcSelectedCredit ? "VAR" : "YOK"}, dcCreditRule=${hasDcCreditRule ? "VAR" : "YOK"}, ttInvoiceAmount=${hasAnyTtInvoiceAmount ? "VAR" : "YOK"}`
          );

          // If collection type tag is missing, dump candidate payment/tahsilat related fields from WSDL and VO
          if (!hasTtCollectionType) {
            try {
              const desc = client.describe();
              const descStr = JSON.stringify(desc);

              // Pull candidate field names that might be related to payment / tahsilat
              const candidateFieldNames = Array.from(
                new Set(
                  descStr
                    .match(/"([A-Za-z0-9_]+)"/g)
                    ?.map((m: string) => m.replace(/"/g, "")) ?? []
                )
              ).filter((name) =>
                /(payment|tahsilat|collect|collection|tt|credit|cash)/i.test(name)
              );

              const uniqueCandidates = candidateFieldNames.slice(0, 100);

              const voKeys = Object.keys(shippingOrderVO || {});
              const candidateSummary = uniqueCandidates.map((name) => ({
                fieldName: name,
                inVO: voKeys.includes(name),
                value: voKeys.includes(name) ? shippingOrderVO[name] : undefined,
              }));

              console.log("[COD-XML-CANDIDATES] Possible payment/collection related fields from WSDL:", uniqueCandidates);
              console.log("[COD-XML-CANDIDATES-VO] Values on current ShippingOrderVO for those fields:", candidateSummary);
            } catch (introspectErr) {
              console.warn("[COD-XML-CANDIDATES] Failed to introspect WSDL for candidate fields:", introspectErr);
            }
          } else {
            // If ttCollectionType tag is present, still log invoice amount value for completeness
            console.log("[yurtici-soap-xml] COD XML values snapshot:", {
              ttCollectionTypeTagPresent: hasTtCollectionType,
              dcSelectedCreditTagPresent: hasDcSelectedCredit,
              dcCreditRuleTagPresent: hasDcCreditRule,
              ttInvoiceAmountTagPresent: hasAnyTtInvoiceAmount,
              ttInvoiceAmountValue,
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`[shipping-auto] createShipment SOAP error for order ${orderId}:`, err);
      
      // Log XML even on error
      if (client.lastRequest) {
        let xmlRequest = client.lastRequest;
        xmlRequest = xmlRequest.replace(/<(?:ws:)?wsUserName[^>]*>([^<]+)<\/(?:ws:)?wsUserName>/g, (match: string, cred: string) => {
          return match.replace(cred, maskCredential(cred));
        });
        xmlRequest = xmlRequest.replace(/<(?:ws:)?wsPassword[^>]*>([^<]+)<\/(?:ws:)?wsPassword>/g, (match: string, cred: string) => {
          return match.replace(cred, maskCredential(cred));
        });
        console.log("[yurtici-soap-xml] lastRequest (on error):", xmlRequest);
      }
      
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

    // Compute jobId early so we can persist it even on error
    let jobId = Number(vo.jobId ?? 0);
    if (jobId <= 0 && errMessage) {
      const m = errMessage.match(/(\d+)\s*talep\s*nolu/i);
      if (m?.[1]) jobId = Number(m[1]);
    }

    // Check for success (strict) or idempotent success
    // Strict success: outFlag === "0" and no error code in detail
    const strictSuccess = outFlag === "0" && (errCode === 0 || !detail);
    const isIdempotent = errCode === 60020 || /sistemde\s+mevcuttur/i.test(errMessage);
    const reused = isIdempotent || (strictSuccess && !detail);
    const success = strictSuccess || isIdempotent;

    if (!success) {
      const baseMsg = errMessage || outResult || "Yurtiçi createShipment hatası";
      console.error(
        `[shipping-auto] failed - Order ${orderId} - outFlag: ${outFlag}, errCode: ${errCode}, errMessage: ${baseMsg}`
      );

      // Build failure update payload
      const failureUpdate: any = {
        shipping_status: "create_failed",
        shipping_error_message: baseMsg,
        yurtici_job_id: jobId > 0 ? jobId : null,
        yurtici_create_out_flag: outFlag,
        yurtici_create_out_result: outResult,
        yurtici_create_err_code: String(errCode || ""),
        yurtici_create_err_message: baseMsg || null,
        // On failure, ensure reference/debug COD fields are cleared so admin UI reflects failure state
        shipping_reference_number: null,
      };

      if (isCOD) {
        failureUpdate.yurtici_tt_collection_type = null;
        failureUpdate.yurtici_tt_document_id = null;
        failureUpdate.yurtici_tt_invoice_amount = null;
        failureUpdate.yurtici_tt_document_save_type = null;
        failureUpdate.yurtici_dc_credit_rule = null;
        failureUpdate.yurtici_dc_selected_credit = null;
      }

      await supabase.from("orders").update(failureUpdate).eq("id", orderId);

      return {
        ok: false,
        error: baseMsg,
      };
    }

    // Call listInvDocumentInterfaceByReference to get ORDER_SEQ (real tracking number)
    let orderSeq: string | null = null;
    let docNumber: string | null = null;
    let docId: string | null = null;
    let labelUrl: string | null = null;
    let codLabelDocumentId: string | null = null;
    let codLabelDocumentType: string | null = null;
    let reportDocumentTypes: string[] | null = null;

    try {
      // Try to fetch ORDER_SEQ using cargoKey (LT...)
      // Tries both INVOICE_KEY and CARGO_KEY field names internally
      const result = await fetchOrderSeqFromYurtici(cargoKey, apiUser, apiPass, userLanguage);
      orderSeq = result.orderSeq;
      docNumber = result.docNumber;
      docId = result.docId;
      labelUrl = result.labelUrl;
      codLabelDocumentId = result.codLabelDocumentId ?? null;
      codLabelDocumentType = result.codLabelDocumentType ?? null;
      reportDocumentTypes = result.reportDocumentTypes ?? null;
    } catch (listDocErr: any) {
      console.error(`[shipping-auto] listInvDocumentInterfaceByReference error for order ${orderId}:`, listDocErr);
      // Don't fail the shipment creation if this call fails, just log it
    }

    // Update order with shipment info (success case)
    const updateData: any = {
      shipping_carrier: "yurtici",
      shipping_reference_number: cargoKey, // Store cargoKey separately as reference number
      shipping_error_message: null, // Clear any previous error message
      // Persist latest createShipment meta for debugging
      yurtici_job_id: jobId > 0 ? jobId : null,
      yurtici_create_out_flag: outFlag || "0",
      yurtici_create_out_result: outResult || "OK",
      yurtici_create_err_code: null,
      yurtici_create_err_message: null,
      // Note: shipped_at is not set here - it's set when actually shipped
      // Note: shipping_payment_type (cash/card) is already set by admin or defaults to "cash" for COD orders
      // We don't override it here to preserve the admin's selection
    };

    // Persist COD / report related fields for debugging & admin UI
    if (isCOD) {
      // COD confirmed if we have a collection-type document from report
      const codConfirmed = !!codLabelDocumentId && !!codLabelDocumentType;
      updateData.yurtici_cod_doc_id = codLabelDocumentId;
      updateData.yurtici_cod_doc_type = codLabelDocumentType;
      updateData.yurtici_cod_confirmed = codConfirmed;
      updateData.yurtici_report_document_types = reportDocumentTypes;

      // Persist what we sent in COD fields
      updateData.yurtici_tt_collection_type = String(
        shippingOrderVO[codCollectionTypeField] ?? ""
      ) || null;
      updateData.yurtici_tt_document_id = String(
        shippingOrderVO[codDocumentIdField] ?? ""
      ) || null;

      const invAmountRaw = shippingOrderVO[codInvoiceAmountField];
      const invAmountNum =
        typeof invAmountRaw === "number"
          ? invAmountRaw
          : invAmountRaw != null
          ? Number.parseFloat(String(invAmountRaw).replace(",", "."))
          : null;
      updateData.yurtici_tt_invoice_amount =
        invAmountNum != null && !Number.isNaN(invAmountNum) ? invAmountNum : null;

      updateData.yurtici_tt_document_save_type = String(
        shippingOrderVO[codDocumentSaveTypeField] ?? ""
      ) || null;
      updateData.yurtici_dc_credit_rule = String(
        shippingOrderVO[codCreditRuleField] ?? ""
      ) || null;
      updateData.yurtici_dc_selected_credit = String(
        shippingOrderVO[codSelectedCreditField] ?? ""
      ) || null;

      if (!codConfirmed) {
        console.warn(
          `[yurtici-cod] Collection doc not found for cargoKey=${cargoKey}. reportDocumentTypes=`,
          reportDocumentTypes
        );
      }
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


