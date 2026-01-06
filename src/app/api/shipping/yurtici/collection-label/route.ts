export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as soap from "soap";
import { createHash } from "crypto";
import bwipjs from "bwip-js";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Fetches collection label (tahsilat etiketi) from Yurtiçi using documentId
 * Yurtiçi'de tahsilat etiketi için genellikle documentId (ttDocumentId) kullanılır
 */
async function fetchCollectionLabelFromYurtici(
  documentId: string,
  cargoKey: string,
  apiUser: string,
  apiPass: string,
  userLanguage: string
): Promise<{
  labelUrl: string | null;
  documentType: string | null;
  outResult?: string | null;
}> {
  let labelUrl: string | null = null;
  let documentType: string | null = null;
  let outResult: string | null = null;

  try {
    // Get Yurtiçi configuration (REPORT WSDL - WsReportWithReferenceServices)
    const env = process.env.YURTICI_ENV || "test";
    const reportWsdlUrl =
      env === "live"
        ? process.env.YURTICI_REPORT_WSDL_LIVE || "https://ws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl"
        : process.env.YURTICI_REPORT_WSDL_TEST || "https://testws.yurticikargo.com/KOPSWebServices/WsReportWithReferenceServices?wsdl";

    if (!reportWsdlUrl || !apiUser || !apiPass) {
      throw new Error(`Report WSDL URL veya API credentials eksik`);
    }

    console.log(`[yurtici-collection-label] Fetching collection label for documentId: ${documentId}, cargoKey: ${cargoKey}`);

    // Create SOAP client for Report service
    const client = await soap.createClientAsync(reportWsdlUrl);

    // Try DOCUMENT_ID field first (for collection label)
    const payload = {
      userName: apiUser,
      password: apiPass,
      language: userLanguage,
      fieldName: "DOCUMENT_ID",
      fieldValueArray: [documentId],
    };

    // Add custParamsVO if YURTICI_INV_CUST_ID is set
    const invCustId = process.env.YURTICI_INV_CUST_ID;
    if (invCustId) {
      (payload as any).custParamsVO = {
        invCustIdArray: [invCustId],
      };
    }

    console.log(`[yurtici-collection-label] Calling listInvDocumentInterfaceByReference with DOCUMENT_ID: ${documentId}`);

    const [res] = await client.listInvDocumentInterfaceByReferenceAsync(payload);

    if (!res) {
      throw new Error("Yurtiçi response alınamadı");
    }

    // Parse response
    const vo = res?.ShippingDataResponseVO;

    if (!vo) {
      console.error(`[yurtici-collection-label] ShippingDataResponseVO not found in response`);
      return { labelUrl: null, documentType: null, outResult: "Response yapısı bulunamadı" };
    }

    const outFlag = String(vo.outFlag ?? "");
    outResult = String(vo.outResult ?? "");
    console.log(`[yurtici-collection-label] outFlag: ${outFlag}, outResult: ${outResult}`);

    if (outFlag !== "0") {
      console.log(`[yurtici-collection-label] outFlag is not "0", outResult: ${outResult}`);
      return { labelUrl: null, documentType: null, outResult };
    }

    // Parse response - look for collection document type
    const detailsRaw =
      vo?.shippingDataV2DetailVOArray ??
      vo?.shippingDataV2DetailVO ??
      vo?.shippingDataDetailVOArray ??
      vo?.shippingDataDetailVO ??
      vo?.documentDetailVO ??
      [];

    const docDetails = Array.isArray(detailsRaw) ? detailsRaw : detailsRaw ? [detailsRaw] : [];

    console.log(`[yurtici-collection-label] Found ${docDetails.length} detail record(s)`);

    // Look for collection/payment document type
    for (const docDetail of docDetails) {
      const docType = docDetail?.documentType || docDetail?.DOCUMENT_TYPE || docDetail?.docType;
      const docId = docDetail?.docId || docDetail?.DOC_ID;

      // Check if this is a collection document (tahsilat etiketi)
      // Yurtiçi'de genellikle: "COLLECTION", "PAYMENT", "TAHSILAT" gibi değerler
      if (
        docId === documentId &&
        (docType === "COLLECTION" ||
          docType === "PAYMENT" ||
          docType === "TAHSILAT" ||
          docType === "COD" ||
          /collection|payment|tahsilat|cod/i.test(String(docType || "")))
      ) {
        labelUrl = docDetail?.labelUrl || docDetail?.labelURL || docDetail?.label_url || null;
        documentType = String(docType || "");
        console.log(`[yurtici-collection-label] Found collection label - documentType: ${documentType}, labelUrl: ${labelUrl}`);
        break;
      }
    }

    // If not found by documentType, try to get labelUrl directly from any document with matching docId
    if (!labelUrl) {
      for (const docDetail of docDetails) {
        const docId = docDetail?.docId || docDetail?.DOC_ID;
        if (docId === documentId) {
          labelUrl = docDetail?.labelUrl || docDetail?.labelURL || docDetail?.label_url || null;
          documentType = docDetail?.documentType || docDetail?.DOCUMENT_TYPE || "UNKNOWN";
          if (labelUrl) {
            console.log(`[yurtici-collection-label] Found label by docId (documentType: ${documentType}): ${labelUrl}`);
            break;
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[yurtici-collection-label] Error fetching collection label:`, err);
    throw err;
  }

  return { labelUrl, documentType, outResult: outResult || null };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId || typeof orderId !== "string") {
      console.error("[yurtici-collection-label] orderId gerekli");
      return NextResponse.json({ error: "orderId gerekli" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[yurtici-collection-label] Order fetch error:", orderError);
      return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    }

    // Check if order is COD
    const isCOD = order.payment_method === "cod" || order.payment_method === "kapida";
    if (!isCOD) {
      return NextResponse.json({ error: "Bu sipariş kapıda ödeme değil" }, { status: 400 });
    }

    // Check if shipment exists
    if (!order.shipping_reference_number) {
      return NextResponse.json(
        { error: "Kargo kaydı bulunamadı. Lütfen önce kargo oluşturun." },
        { status: 400 }
      );
    }

    // Get documentId from order - prefer cod_label_document_id (from Yurtiçi response)
    // Fallback to shipping_collection_document_id (ttDocumentId sent in createShipment)
    // If neither exists, generate it (same logic as createShipment)
    let documentId: string;
    if ((order as any).cod_label_document_id) {
      documentId = String((order as any).cod_label_document_id);
      console.log(`[yurtici-collection-label] Using cod_label_document_id from Yurtiçi: ${documentId}`);
    } else if ((order as any).shipping_collection_document_id) {
      documentId = String((order as any).shipping_collection_document_id);
      console.log(`[yurtici-collection-label] Using shipping_collection_document_id (ttDocumentId): ${documentId}`);
    } else {
      // Generate same way as createShipment
      const orderIdHash = createHash("sha256").update(orderId).digest("hex");
      const hexPrefix = orderIdHash.substring(0, 12);
      const num = BigInt(`0x${hexPrefix}`);
      const numStr = num.toString();
      documentId = numStr.slice(-12).padStart(12, "0");
      console.log(`[yurtici-collection-label] Generated documentId: ${documentId}`);
    }
    
    // Get documentType if available
    const documentType = (order as any).cod_label_document_type || null;
    if (documentType) {
      console.log(`[yurtici-collection-label] Using cod_label_document_type: ${documentType}`);
    }

    const cargoKey = order.shipping_reference_number as string;
    const apiUser = process.env.YURTICI_USER_GO;
    const apiPass = process.env.YURTICI_PASS_GO;
    const userLanguage = process.env.YURTICI_LANG || "TR";

    if (!apiUser || !apiPass) {
      return NextResponse.json({ error: "Yurtiçi API credentials eksik" }, { status: 500 });
    }

    // Try to fetch collection label from Yurtiçi
    let collectionLabelUrl: string | null = null;
    try {
      const result = await fetchCollectionLabelFromYurtici(
        documentId,
        cargoKey,
        apiUser,
        apiPass,
        userLanguage
      );
      collectionLabelUrl = result.labelUrl;
      
      // If documentType found, save it to order
      if (result.documentType) {
        await supabase
          .from("orders")
          .update({
            shipping_collection_document_type: result.documentType,
            shipping_collection_document_id: documentId,
          })
          .eq("id", orderId);
      }
    } catch (fetchErr: any) {
      console.error("[yurtici-collection-label] Error fetching from Yurtiçi:", fetchErr);
      // Continue to generate local label even if Yurtiçi fetch fails
    }

    // If Yurtiçi label URL is available, redirect to it
    if (collectionLabelUrl) {
      console.log(`[yurtici-collection-label] Redirecting to Yurtiçi label URL: ${collectionLabelUrl}`);
      return NextResponse.redirect(collectionLabelUrl);
    }

    // Otherwise, generate local collection label PDF
    console.log(`[yurtici-collection-label] Generating local collection label PDF for order ${orderId}`);

    // Format amount
    const amount = Number(order.total_price ?? 0).toFixed(2).replace(".", ",");

    // Generate barcode for documentId (CODE128)
    let barcodePng: Buffer;
    try {
      barcodePng = await bwipjs.toBuffer({
        bcid: "code128",
        text: documentId,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: "center",
      });
    } catch (barcodeErr: any) {
      console.error("[yurtici-collection-label] Barcode generation error:", barcodeErr);
      return NextResponse.json(
        { error: `Barkod oluşturulamadı: ${barcodeErr.message}` },
        { status: 500 }
      );
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load font
    const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf");
    const fontBytes = await fs.readFile(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);

    // 100mm x 80mm label size (1mm = 2.83464 points) - EXACT size for thermal label
    const labelWidthMm = 100;
    const labelHeightMm = 80;
    const labelWidthPoints = labelWidthMm * 2.83464; // 283.464 points
    const labelHeightPoints = labelHeightMm * 2.83464; // 226.7712 points
    const page = pdfDoc.addPage([labelWidthPoints, labelHeightPoints]);

    // Embed barcode
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    
    // Page dimensions
    const pageWidth = labelWidthPoints;
    const pageHeight = labelHeightPoints;
    
    // Padding: 6mm (as per spec)
    const paddingMm = 6;
    const paddingPoints = paddingMm * 2.83464; // ~17.01 points
    
    // Safe area: right 15-20mm, bottom 15mm (Yurtiçi logo area)
    const safeAreaRightMm = 18;
    const safeAreaBottomMm = 15;
    const safeAreaRightPoints = safeAreaRightMm * 2.83464; // ~51.02 points
    const safeAreaBottomPoints = safeAreaBottomMm * 2.83464; // 42.5196 points
    
    // Content area: page minus padding (box-sizing: border-box equivalent)
    const contentWidth = pageWidth - (paddingPoints * 2);
    const contentHeight = pageHeight - (paddingPoints * 2);
    
    // Calculate usable area (excluding safe area)
    const usableWidth = contentWidth - safeAreaRightPoints;
    const usableHeight = contentHeight - safeAreaBottomPoints;

    // Layout structure (as per spec):
    // - Header: max-height 14mm
    // - Barcode area: height 34mm (fixed)
    // - Footer: remaining space

    // Helper function to center text horizontally within content area
    const getCenteredX = (text: string, fontSize: number): number => {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      return paddingPoints + (contentWidth - textWidth) / 2;
    };

    // Start from top (with padding)
    let yPos = pageHeight - paddingPoints;
    const lineSpacing = 3; // Compact spacing

    // HEADER SECTION (max-height 14mm)
    const headerMaxHeightMm = 14;
    const headerMaxHeightPoints = headerMaxHeightMm * 2.83464; // ~39.68 points
    
    // 1. Title at top - CENTERED, max 4mm font
    const titleSizeMm = 4;
    const titleSize = titleSizeMm * 2.83464; // ~11.34 points
    yPos -= titleSize + lineSpacing;
    const titleText = "Lezzette Tek - Tahsilat Etiketi";
    page.drawText(titleText, {
      x: getCenteredX(titleText, titleSize),
      y: yPos,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    });

    // 2. Document ID label - CENTERED, max 6mm font
    const labelSizeMm = 6;
    const labelSize = labelSizeMm * 2.83464; // ~17.01 points
    yPos -= labelSize + lineSpacing;
    page.drawText("Belge No:", {
      x: getCenteredX("Belge No:", labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Document ID value - CENTERED, max 6mm font
    yPos -= labelSize + lineSpacing;
    page.drawText(documentId, {
      x: getCenteredX(documentId, labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // BARCODE SECTION (height 34mm, fixed)
    const barcodeAreaHeightMm = 34;
    const barcodeAreaHeightPoints = barcodeAreaHeightMm * 2.83464; // ~96.38 points
    
    // Barcode wrapper: 88mm width, 30mm height (as per spec)
    const barcodeWrapperWidthMm = 88;
    const barcodeWrapperHeightMm = 30;
    const barcodeWrapperWidthPoints = barcodeWrapperWidthMm * 2.83464; // ~249.45 points
    const barcodeWrapperHeightPoints = barcodeWrapperHeightMm * 2.83464; // ~85.04 points
    
    // Calculate barcode scale to fit within wrapper
    const maxBarcodeWidth = barcodeWrapperWidthPoints;
    const maxBarcodeHeight = barcodeWrapperHeightPoints;
    const widthScale = maxBarcodeWidth / barcodeImage.width;
    const heightScale = maxBarcodeHeight / barcodeImage.height;
    const barcodeScale = Math.min(1.0, widthScale, heightScale);
    const barcodeDims = barcodeImage.scale(barcodeScale);
    
    // Center barcode horizontally within content area
    const barcodeX = paddingPoints + (contentWidth - barcodeDims.width) / 2;
    
    // Position barcode in barcode area (centered vertically in the 34mm area)
    const barcodeAreaStartY = yPos - barcodeAreaHeightPoints;
    const barcodeY = barcodeAreaStartY + (barcodeAreaHeightPoints - barcodeDims.height) / 2;
    
    // Draw barcode - CENTERED
    page.drawImage(barcodeImage, {
      x: barcodeX,
      y: barcodeY,
      width: barcodeDims.width,
      height: barcodeDims.height,
    });
    
    // Barcode text (below barcode) - CENTERED, 5mm font, line-height: 1
    const barcodeTextSizeMm = 5;
    const barcodeTextSize = barcodeTextSizeMm * 2.83464; // ~14.17 points
    yPos = barcodeY - barcodeDims.height - (barcodeTextSize * 1); // line-height: 1
    page.drawText(documentId, {
      x: getCenteredX(documentId, barcodeTextSize),
      y: yPos,
      size: barcodeTextSize,
      font,
      color: rgb(0, 0, 0),
    });

    // FOOTER SECTION (remaining space, above safe area)
    yPos = barcodeAreaStartY - lineSpacing;
    
    // Collection amount label - CENTERED, max 7mm font
    const amountLabelSizeMm = 7;
    const amountLabelSize = amountLabelSizeMm * 2.83464; // ~19.84 points
    yPos -= amountLabelSize + lineSpacing;
    page.drawText("Tahsilat Tutarı:", {
      x: getCenteredX("Tahsilat Tutarı:", amountLabelSize),
      y: yPos,
      size: amountLabelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Collection amount value - CENTERED, max 7mm font (prominent but within limit)
    yPos -= amountLabelSize + lineSpacing;
    const amountText = `${amount} TL`;
    page.drawText(amountText, {
      x: getCenteredX(amountText, amountLabelSize),
      y: yPos,
      size: amountLabelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Order info (compact, 3-3.2mm font) - LEFT ALIGNED
    const infoSizeMm = 3.2;
    const infoSize = infoSizeMm * 2.83464; // ~9.07 points
    const infoX = paddingPoints;
    const footerMinY = paddingPoints + safeAreaBottomPoints;
    
    yPos -= lineSpacing * 2;
    if (yPos > footerMinY) {
      const orderIdShort = order.id.substring(0, 8);
      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        page.drawText(`Sipariş: ${orderIdShort}...`, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        const customerName = (order.customer_name ?? "-").substring(0, 25);
        page.drawText(`Alıcı: ${customerName}`, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        const address = `${order.address ?? "-"}, ${order.district ?? "-"}`.substring(0, 30);
        page.drawText(address, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
    
    // Overflow protection: All content is within page bounds
    // PDF automatically clips content outside page dimensions (equivalent to overflow: hidden)

    // Set PDF metadata for thermal label printing
    // Single label per page, exact 100mm x 80mm, no scaling
    pdfDoc.setTitle(`Yurtiçi Tahsilat Etiketi - ${documentId}`);
    pdfDoc.setCreator("Lezzette Tek");
    pdfDoc.setProducer("Lezzette Tek Label Generator");
    
    // Generate PDF bytes - ensures single page, exact size
    const pdfBytes = await pdfDoc.save();

    // Convert Uint8Array to Buffer for NextResponse compatibility
    // pdfDoc.save() returns Uint8Array, but NextResponse expects BodyInit (Buffer/ArrayBuffer)
    const pdfBuffer = Buffer.from(pdfBytes);

    // Return PDF with print-optimized headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="yurtici-tahsilat-${documentId}.pdf"`,
        "Cache-Control": "no-store",
        // Print hints: exact size, no scaling, single page
        "X-PDF-Page-Size": "100mm x 80mm",
        "X-PDF-Single-Page": "true",
      },
    });
  } catch (err: any) {
    console.error("[yurtici-collection-label] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Tahsilat etiketi oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

