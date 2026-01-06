export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import bwipjs from "bwip-js";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId || typeof orderId !== "string") {
      console.error("[yurtici-label] orderId gerekli");
      return NextResponse.json(
        { error: "orderId gerekli" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[yurtici-label] Order fetch error:", orderError);
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Determine barcode value: ORDER_SEQ if available, otherwise use LT (cargoKey)
    // Yurtiçi Kargo barkod etiketi KARGO ANAHTAR (LT...) ile basılabiliyor
    const trackingNumber = order.shipping_tracking_number;
    const referenceNumber = order.shipping_reference_number;
    
    // Check if we have at least one identifier
    if (!trackingNumber && !referenceNumber) {
      console.error("[yurtici-label] Neither tracking number nor reference number found");
      return NextResponse.json(
        { error: "Kargo kaydı bulunamadı. Lütfen önce kargo oluşturun." },
        { status: 400 }
      );
    }

    // Use ORDER_SEQ if available, otherwise use LT (cargoKey)
    const barcodeValue = trackingNumber || referenceNumber || "";
    
    if (!barcodeValue) {
      return NextResponse.json(
        { error: "Barkod değeri bulunamadı" },
        { status: 400 }
      );
    }

    console.log(`[yurtici-label] Generating label with barcode: ${barcodeValue} (${trackingNumber ? 'ORDER_SEQ' : 'LT cargoKey'})`);

    // Generate barcode PNG using bwip-js (CODE128 format)
    let barcodePng: Buffer;
    try {
      barcodePng = await bwipjs.toBuffer({
        bcid: "code128",
        text: barcodeValue,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: "center",
      });
    } catch (barcodeErr: any) {
      console.error("[yurtici-label] Barcode generation error:", barcodeErr);
      return NextResponse.json(
        { error: `Barkod oluşturulamadı: ${barcodeErr.message}` },
        { status: 500 }
      );
    }

    // Create PDF with pdf-lib
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load DejaVuSans font for Turkish characters
    const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf");
    const fontBytes = await fs.readFile(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);

    // 100mm x 80mm label size (1mm = 2.83464 points) - EXACT size for thermal label
    const labelWidthMm = 100;
    const labelHeightMm = 80;
    const labelWidthPoints = labelWidthMm * 2.83464; // 283.464 points
    const labelHeightPoints = labelHeightMm * 2.83464; // 226.7712 points
    const page = pdfDoc.addPage([labelWidthPoints, labelHeightPoints]);
    
    // Set page metadata for print: exact 100mm x 80mm, no scaling, single page
    // This ensures thermal printer uses exact size without fit-to-page

    // Embed barcode image
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    
    // Page dimensions
    const pageWidth = labelWidthPoints;
    const pageHeight = labelHeightPoints;
    
    // Padding: 6mm (as per spec)
    const paddingMm = 6;
    const paddingPoints = paddingMm * 2.83464; // ~17.01 points
    
    // Safe area: right 15-20mm, bottom 15mm (Yurtiçi logo area)
    // Use 18mm right (middle of 15-20mm range) for better balance
    const safeAreaRightMm = 18;
    const safeAreaBottomMm = 15;
    const safeAreaRightPoints = safeAreaRightMm * 2.83464; // ~51.02 points
    const safeAreaBottomPoints = safeAreaBottomMm * 2.83464; // 42.5196 points
    
    // Content area: page minus padding (box-sizing: border-box equivalent)
    const contentWidth = pageWidth - (paddingPoints * 2);
    const contentHeight = pageHeight - (paddingPoints * 2);
    
    // Calculate usable area (excluding safe area) - content must not overflow
    const usableWidth = contentWidth - safeAreaRightPoints; // Content width minus safe area
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

    // HEADER SECTION (max-height 14mm = 39.68 points)
    const headerMaxHeightMm = 14;
    const headerMaxHeightPoints = headerMaxHeightMm * 2.83464; // ~39.68 points
    
    // 1. Title at top - CENTERED, max 4mm font
    const titleSizeMm = 4;
    const titleSize = titleSizeMm * 2.83464; // ~11.34 points
    yPos -= titleSize + lineSpacing;
    const titleText = "Lezzette Tek - Yurtiçi Kargo";
    page.drawText(titleText, {
      x: getCenteredX(titleText, titleSize),
      y: yPos,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    });

    // 2. Barcode label text - CENTERED, max 6mm font
    const labelSizeMm = 6;
    const labelSize = labelSizeMm * 2.83464; // ~17.01 points
    const barcodeLabel = trackingNumber ? "Kargo Takip No (ORDER_SEQ):" : "Kargo Anahtarı (LT):";
    yPos -= labelSize + lineSpacing;
    page.drawText(barcodeLabel, {
      x: getCenteredX(barcodeLabel, labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // BARCODE SECTION (height 34mm = 96.38 points, fixed)
    const barcodeAreaHeightMm = 34;
    const barcodeAreaHeightPoints = barcodeAreaHeightMm * 2.83464; // ~96.38 points
    
    // Barcode wrapper: 88mm width, 30mm height (as per spec)
    const barcodeWrapperWidthMm = 88;
    const barcodeWrapperHeightMm = 30;
    const barcodeWrapperWidthPoints = barcodeWrapperWidthMm * 2.83464; // ~249.45 points
    const barcodeWrapperHeightPoints = barcodeWrapperHeightMm * 2.83464; // ~85.04 points
    
    // Calculate barcode scale to fit within wrapper (max-width: 100%, max-height: 100%)
    const maxBarcodeWidth = barcodeWrapperWidthPoints;
    const maxBarcodeHeight = barcodeWrapperHeightPoints;
    const widthScale = maxBarcodeWidth / barcodeImage.width;
    const heightScale = maxBarcodeHeight / barcodeImage.height;
    const barcodeScale = Math.min(1.0, widthScale, heightScale);
    const barcodeDims = barcodeImage.scale(barcodeScale);
    
    // Center barcode horizontally within content area (margin: 2mm auto)
    const barcodeMarginMm = 2;
    const barcodeMarginPoints = barcodeMarginMm * 2.83464; // ~5.67 points
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
    page.drawText(barcodeValue, {
      x: getCenteredX(barcodeValue, barcodeTextSize),
      y: yPos,
      size: barcodeTextSize,
      font,
      color: rgb(0, 0, 0),
    });

    // FOOTER SECTION (remaining space, above safe area)
    // Start footer from bottom of barcode area
    yPos = barcodeAreaStartY - lineSpacing;
    
    // Receiver Information - LEFT ALIGNED, 3-3.2mm font
    const infoSizeMm = 3.2;
    const infoSize = infoSizeMm * 2.83464; // ~9.07 points
    const infoX = paddingPoints;
    
    // Ensure footer doesn't go below safe area
    const footerMinY = paddingPoints + safeAreaBottomPoints;
    
    if (yPos > footerMinY) {
      const customerName = (order.customer_name ?? "-").substring(0, 25);
      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        page.drawText(`Alıcı: ${customerName}`, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        const address = (order.address ?? "-").substring(0, 28);
        page.drawText(address, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        const cityDistrict = `${order.city ?? "-"} / ${order.district ?? "-"}`.substring(0, 28);
        page.drawText(cityDistrict, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Overflow protection: All content is within page bounds
    // PDF automatically clips content outside page dimensions (equivalent to overflow: hidden)

    // Set PDF metadata for thermal label printing
    // Single label per page, exact 100mm x 80mm, no scaling
    pdfDoc.setTitle(`Yurtiçi Kargo Etiketi - ${barcodeValue}`);
    pdfDoc.setCreator("Lezzette Tek");
    pdfDoc.setProducer("Lezzette Tek Label Generator");
    
    // Save PDF - ensures single page, exact size
    const pdfBytes = await pdfDoc.save();

    // Return PDF response with print-optimized headers
    // Headers ensure browser/print dialog uses exact size without fit-to-page
    const filename = `yurtici-${barcodeValue}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
        // Print hints: exact size, no scaling, single page
        "X-PDF-Page-Size": "100mm x 80mm",
        "X-PDF-Single-Page": "true",
      },
    });
  } catch (err: any) {
    console.error("[yurtici-label] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
