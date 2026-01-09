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

    // Helper: mm to points conversion (1 inch = 25.4mm = 72 points)
    const mmToPt = (mm: number) => (mm * 72) / 25.4;

    // Label page size MUST match printer paper size (NO A4 fallback)
    // Required: 80mm x 100mm (portrait - dikey), margin: 0
    const labelWidthMm = 80;
    const labelHeightMm = 100;
    const labelWidthPoints = mmToPt(labelWidthMm); // ~226.77 points
    const labelHeightPoints = mmToPt(labelHeightMm); // ~283.46 points
    
    const page = pdfDoc.addPage([labelWidthPoints, labelHeightPoints]);
    
    // Set exact page size using pdf-lib API (ensures all boxes match)
    page.setSize(labelWidthPoints, labelHeightPoints);
    
    // Verify page dimensions before rendering
    const pageSize = page.getSize();
    console.log(`[yurtici-collection-label] PDF page size: ${pageSize.width.toFixed(2)} x ${pageSize.height.toFixed(2)} points (${labelWidthMm}mm x ${labelHeightMm}mm)`);

    // Embed barcode
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    
    // Page dimensions
    const pageWidth = labelWidthPoints;
    const pageHeight = labelHeightPoints;
    
    // Global offset to avoid printer clipping (shift content left and up)
    const offsetXmm = -2; // 2mm left (negative = left shift)
    const offsetYmm = 3;  // 3mm up (positive = up shift)
    const offsetXpoints = mmToPt(offsetXmm);
    const offsetYpoints = mmToPt(offsetYmm);
    
    // Padding: 2mm (minimal for 60x80mm label to maximize content area)
    const paddingMm = 2;
    const paddingPoints = mmToPt(paddingMm);
    
    // Safe area: right 8mm, bottom 6mm (Yurtiçi logo area, minimized for smaller label)
    const safeAreaRightMm = 8;
    const safeAreaBottomMm = 6;
    const safeAreaRightPoints = mmToPt(safeAreaRightMm);
    const safeAreaBottomPoints = mmToPt(safeAreaBottomMm);
    
    // Content area: page minus padding (box-sizing: border-box equivalent)
    const contentWidth = pageWidth - (paddingPoints * 2);
    const contentHeight = pageHeight - (paddingPoints * 2);
    
    // Calculate usable area (excluding safe area)
    const usableWidth = contentWidth - safeAreaRightPoints;
    const usableHeight = contentHeight - safeAreaBottomPoints;

    // Layout structure (adjusted for 80x100mm portrait - dikey):
    // - Header: max-height 8mm (balanced)
    // - Barcode area: height 38mm (increased for portrait)
    // - Footer: remaining space (at least 50mm for amount and order info)

    // Helper function to center text horizontally within content area (with offset)
    const getCenteredX = (text: string, fontSize: number): number => {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      return paddingPoints + (contentWidth - textWidth) / 2 + offsetXpoints;
    };

    // Start from top (with padding + offset)
    let yPos = pageHeight - paddingPoints + offsetYpoints;
    const lineSpacing = 2.5; // Compact spacing

    // HEADER SECTION (max-height 8mm, balanced for 100x80mm)
    const headerMaxHeightMm = 8;
    const headerMaxHeightPoints = mmToPt(headerMaxHeightMm);
    
    // 1. Title at top - CENTERED, 4mm font
    const titleSizeMm = 4;
    const titleSize = mmToPt(titleSizeMm);
    yPos -= titleSize + lineSpacing;
    const titleText = "Lezzette Tek - Tahsilat Etiketi";
    page.drawText(titleText, {
      x: getCenteredX(titleText, titleSize),
      y: yPos,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    });

    // 2. Document ID label - CENTERED, 4.5mm font
    const labelSizeMm = 4.5;
    const labelSize = mmToPt(labelSizeMm);
    yPos -= labelSize + lineSpacing;
    page.drawText("Belge No:", {
      x: getCenteredX("Belge No:", labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Document ID value - CENTERED, 3.5mm font
    yPos -= labelSize + lineSpacing;
    page.drawText(documentId, {
      x: getCenteredX(documentId, labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // BARCODE SECTION (height 38mm, increased for 80x100mm portrait)
    const barcodeAreaHeightMm = 38;
    const barcodeAreaHeightPoints = mmToPt(barcodeAreaHeightMm);
    
    // Barcode wrapper: use available width minus safe area, max 32mm height
    const barcodeWrapperWidthMm = labelWidthMm - (paddingMm * 2) - safeAreaRightMm;
    const barcodeWrapperHeightMm = 32;
    const barcodeWrapperWidthPoints = mmToPt(barcodeWrapperWidthMm);
    const barcodeWrapperHeightPoints = mmToPt(barcodeWrapperHeightMm);
    
    // Barcode text (below barcode) - CENTERED, 6mm font
    const barcodeTextSizeMm = 6;
    const barcodeTextSize = mmToPt(barcodeTextSizeMm);

    // Calculate barcode scale to fit within wrapper AND within remaining height of the barcode area
    const maxBarcodeWidth = barcodeWrapperWidthPoints;
    const maxBarcodeHeight = Math.min(
      barcodeWrapperHeightPoints,
      barcodeAreaHeightPoints - barcodeTextSize - lineSpacing * 2
    );
    const widthScale = maxBarcodeWidth / barcodeImage.width;
    const heightScale = maxBarcodeHeight / barcodeImage.height;
    const barcodeScale = Math.min(1.0, widthScale, heightScale);
    const barcodeDims = barcodeImage.scale(barcodeScale);
    
    // Center barcode horizontally within content area + offset
    const barcodeX = paddingPoints + (contentWidth - barcodeDims.width) / 2 + offsetXpoints;
    
    // Position barcode + text in barcode area (centered as a group)
    const barcodeAreaStartY = yPos - barcodeAreaHeightPoints;
    const groupHeight = barcodeDims.height + barcodeTextSize + lineSpacing;
    const groupStartY = barcodeAreaStartY + (barcodeAreaHeightPoints - groupHeight) / 2;
    const textY = groupStartY;
    const barcodeY = textY + barcodeTextSize + lineSpacing;
    
    // Draw barcode - CENTERED
    page.drawImage(barcodeImage, {
      x: barcodeX,
      y: barcodeY,
      width: barcodeDims.width,
      height: barcodeDims.height,
    });
    
    page.drawText(documentId, {
      x: getCenteredX(documentId, barcodeTextSize),
      y: textY,
      size: barcodeTextSize,
      font,
      color: rgb(0, 0, 0),
    });

    // FOOTER SECTION (remaining space, above safe area)
    yPos = barcodeAreaStartY - lineSpacing;
    
    // Collection amount label - CENTERED, 5.5mm font (increased for better visibility)
    const amountLabelSizeMm = 5.5;
    const amountLabelSize = mmToPt(amountLabelSizeMm);
    yPos -= amountLabelSize + lineSpacing;
    page.drawText("Tahsilat Tutarı:", {
      x: getCenteredX("Tahsilat Tutarı:", amountLabelSize),
      y: yPos,
      size: amountLabelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Collection amount value - CENTERED, 4.5mm font
    yPos -= amountLabelSize + lineSpacing;
    const amountText = `${amount} TL`;
    page.drawText(amountText, {
      x: getCenteredX(amountText, amountLabelSize),
      y: yPos,
      size: amountLabelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Order info - LEFT ALIGNED, 4mm font (increased for better readability on larger label)
    const infoSizeMm = 4;
    const infoSize = mmToPt(infoSizeMm);
    const infoX = paddingPoints + offsetXpoints;
    const footerMinY = paddingPoints + safeAreaBottomPoints;
    
    yPos -= lineSpacing;
    if (yPos > footerMinY) {
      const orderIdShort = order.id.substring(0, 12);
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
    // Single label per page, exact 80mm x 100mm (portrait - dikey), no scaling
    pdfDoc.setTitle(`Yurtiçi Tahsilat Etiketi - ${documentId}`);
    pdfDoc.setCreator("Lezzette Tek");
    pdfDoc.setProducer("Lezzette Tek Label Generator");
    
    // Ensure only ONE page in PDF
    if (pdfDoc.getPageCount() > 1) {
      // Remove extra pages if any
      while (pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(pdfDoc.getPageCount() - 1);
      }
    }
    
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
        "X-PDF-Page-Size": "80mm x 100mm",
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

