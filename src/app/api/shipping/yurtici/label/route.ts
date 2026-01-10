export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import bwipjs from "bwip-js";
import { PDFDocument, rgb, degrees } from "pdf-lib";
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

    // Helper: mm to points conversion (1 inch = 25.4mm = 72 points)
    const mmToPt = (mm: number) => (mm * 72) / 25.4;

    // Label page size MUST match printer paper size EXACTLY (NO A4 fallback)
    // Physical label: 100mm x 80mm (landscape)
    // PDF page: 100mm x 80mm (landscape) - EXACT MATCH, NO ROTATION
    const labelWidthMm = 100;  // PDF page width = physical label width
    const labelHeightMm = 80;   // PDF page height = physical label height
    const labelWidthPoints = mmToPt(labelWidthMm); // ~283.46 points
    const labelHeightPoints = mmToPt(labelHeightMm); // ~226.77 points
    
    const page = pdfDoc.addPage([labelWidthPoints, labelHeightPoints]);
    
    // Set exact page size using pdf-lib API (ensures all boxes match)
    // Width = 100mm, Height = 80mm (landscape) - EXACT MATCH
    page.setSize(labelWidthPoints, labelHeightPoints);
    
    // Rotate page -90° (counter-clockwise) to compensate for printer's 90° rotation
    page.setRotation(degrees(-90));
    
    // Apply translation: +10mm to X (after rotation, this shifts content right)
    // After -90° rotation, original X becomes Y, so we adjust offsetXpoints
    const translationXmm = 10; // +10mm right shift (after rotation)
    const translationXpoints = mmToPt(translationXmm);
    
    // Y offset for rotation: prevents content from sticking to top edge
    // After -90° rotation, Y coordinates come from original X, need offset to push down
    const rotationYOffsetMm = 18; // +18mm down shift (prevents top sticking, moves content down more)
    const rotationYOffsetPoints = mmToPt(rotationYOffsetMm);
    
    // Verify page dimensions before rendering
    const pageSize = page.getSize();
    console.log(`[yurtici-label] PDF page size: ${pageSize.width.toFixed(2)} x ${pageSize.height.toFixed(2)} points (${labelWidthMm}mm x ${labelHeightMm}mm)`);

    // Embed barcode image
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    
    // Page dimensions
    const pageWidth = labelWidthPoints;
    const pageHeight = labelHeightPoints;
    
    // Global offset to avoid printer clipping (shift content left and up)
    const offsetXmm = -5; // 5mm left (negative = left shift, increased to move content left)
    const offsetYmm = 2;  // 2mm up (positive = up shift)
    const offsetXpoints = mmToPt(offsetXmm) + translationXpoints; // After rotation, this moves content left
    const offsetYpoints = mmToPt(offsetYmm);
    
    // Padding: 3mm (balanced for 100x80mm landscape label)
    const paddingMm = 3;
    const paddingPoints = mmToPt(paddingMm);
    
    // Safe area: right 8mm (Yurtiçi logo area), bottom 6mm
    const safeAreaRightMm = 8;
    const safeAreaBottomMm = 6;
    const safeAreaRightPoints = mmToPt(safeAreaRightMm);
    const safeAreaBottomPoints = mmToPt(safeAreaBottomMm);
    
    // Content area: page minus padding (box-sizing: border-box equivalent)
    const contentWidth = pageWidth - (paddingPoints * 2);
    const contentHeight = pageHeight - (paddingPoints * 2);
    
    // Calculate usable area (excluding safe area) - content must not overflow
    const usableWidth = contentWidth - safeAreaRightPoints; // Content width minus safe area
    const usableHeight = contentHeight - safeAreaBottomPoints;

    // Layout structure (adjusted for 100x80mm landscape):
    // - Header: max-height 7mm
    // - Barcode area: height 28mm
    // - Footer: remaining space (at least 42mm for address info)
    
    // Helper function to center text horizontally within content area (with offset)
    const getCenteredX = (text: string, fontSize: number): number => {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      return paddingPoints + (contentWidth - textWidth) / 2 + offsetXpoints;
    };

    // Start from top (with padding + offset - rotation Y offset)
    // Subtract rotationYOffsetPoints to prevent content sticking to top after rotation
    let yPos = pageHeight - paddingPoints + offsetYpoints - rotationYOffsetPoints;
    const lineSpacing = 2; // Reduced spacing to save vertical space

    // HEADER SECTION (max-height 7mm, reduced to save space)
    const headerMaxHeightMm = 7;
    const headerMaxHeightPoints = mmToPt(headerMaxHeightMm);
    
    // 1. Title at top - CENTERED, 3.5mm font (reduced)
    const titleSizeMm = 3.5;
    const titleSize = mmToPt(titleSizeMm);
    yPos -= titleSize + lineSpacing;
    const titleText = "Lezzette Tek - Yurtiçi Kargo";
    page.drawText(titleText, {
      x: getCenteredX(titleText, titleSize),
      y: yPos,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    });

    // 2. Barcode label text - CENTERED, 3.5mm font (reduced)
    const labelSizeMm = 3.5;
    const labelSize = mmToPt(labelSizeMm);
    const barcodeLabel = trackingNumber ? "Kargo Takip No:" : "Kargo Anahtarı (LT):";
    yPos -= labelSize + lineSpacing;
    page.drawText(barcodeLabel, {
      x: getCenteredX(barcodeLabel, labelSize),
      y: yPos,
      size: labelSize,
      font,
      color: rgb(0, 0, 0),
    });

    // BARCODE SECTION (height 28mm, balanced for 100x80mm landscape)
    const barcodeAreaHeightMm = 28;
    const barcodeAreaHeightPoints = mmToPt(barcodeAreaHeightMm);
    
    // Barcode wrapper: use available width minus safe area, max 24mm height
    // Width = 100mm (landscape) - padding - safe area
    const barcodeWrapperWidthMm = labelWidthMm - (paddingMm * 2) - safeAreaRightMm;
    const barcodeWrapperHeightMm = 24;
    const barcodeWrapperWidthPoints = mmToPt(barcodeWrapperWidthMm);
    const barcodeWrapperHeightPoints = mmToPt(barcodeWrapperHeightMm);
    
    // Barcode text (below barcode) - CENTERED, 5mm font (reduced)
    const barcodeTextSizeMm = 5;
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
    
    page.drawText(barcodeValue, {
      x: getCenteredX(barcodeValue, barcodeTextSize),
      y: textY,
      size: barcodeTextSize,
      font,
      color: rgb(0, 0, 0),
    });

    // FOOTER SECTION (remaining space, above safe area)
    // Start footer from bottom of barcode area
    yPos = barcodeAreaStartY - lineSpacing;
    
    // Receiver Information - LEFT ALIGNED, 3.5mm font (reduced to fit better)
    const infoSizeMm = 3.5;
    const infoSize = mmToPt(infoSizeMm);
    const infoX = paddingPoints + offsetXpoints;
    
    // Ensure footer doesn't go below safe area
    const footerMinY = paddingPoints + safeAreaBottomPoints;
    
    // Helper function to split long text into multiple lines that fit within maxWidth
    const splitTextToLines = (text: string, maxWidth: number, fontSize: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Single word is too long, truncate it
            let truncated = word;
            while (font.widthOfTextAtSize(truncated, fontSize) > maxWidth && truncated.length > 1) {
              truncated = truncated.substring(0, truncated.length - 1);
            }
            lines.push(truncated);
            currentLine = '';
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines.length > 0 ? lines : [''];
    };

    // Calculate max width for address text (content width minus safe area minus offset)
    // Use full content width, text will be clipped by safe area automatically
    const maxAddressWidth = contentWidth - safeAreaRightPoints;

    // Always draw address info if space available
    if (yPos > footerMinY) {
      // Customer name (max 38 chars for 100mm width landscape)
      const customerName = (order.customer_name ?? "-").substring(0, 38);
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

      // Address - split into multiple lines if needed (max 38 chars per line)
      const address = order.address ?? "-";
      const addressLines = splitTextToLines(address, maxAddressWidth, infoSize);
      
      // Draw address lines (max 2 lines to save space)
      for (let i = 0; i < Math.min(2, addressLines.length); i++) {
        yPos -= infoSize + lineSpacing;
        if (yPos >= footerMinY) {
          page.drawText(addressLines[i], {
            x: infoX,
            y: yPos,
            size: infoSize,
            font,
            color: rgb(0, 0, 0),
          });
        } else {
          break;
        }
      }

      // City / District (max 38 chars for 100mm width landscape)
      yPos -= infoSize + lineSpacing;
      if (yPos >= footerMinY) {
        const cityDistrict = `${order.city ?? "-"} / ${order.district ?? "-"}`.substring(0, 38);
        page.drawText(cityDistrict, {
          x: infoX,
          y: yPos,
          size: infoSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      // Phone number if available and space
      if (order.phone) {
        yPos -= infoSize + lineSpacing;
        if (yPos >= footerMinY) {
          const phone = (order.phone ?? "").substring(0, 38);
          page.drawText(`Tel: ${phone}`, {
            x: infoX,
            y: yPos,
            size: infoSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
    
    // Overflow protection: All content is within page bounds
    // PDF automatically clips content outside page dimensions (equivalent to overflow: hidden)

    // Set PDF metadata for thermal label printing
    // Single label per page, exact 100mm x 80mm (landscape) - EXACT MATCH to physical label
    // No rotation, no scaling required - 1:1 match
    pdfDoc.setTitle(`Yurtiçi Kargo Etiketi - ${barcodeValue}`);
    pdfDoc.setCreator("Lezzette Tek");
    pdfDoc.setProducer("Lezzette Tek Label Generator");
    
    // Ensure only ONE page in PDF
    if (pdfDoc.getPageCount() > 1) {
      // Remove extra pages if any
      while (pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(pdfDoc.getPageCount() - 1);
      }
    }
    
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
        // PDF size: 100mm x 80mm (landscape) - EXACT MATCH to physical label
        // PDF is rotated -90° to compensate for printer rotation
        "X-PDF-Page-Size": "100mm x 80mm",
        "X-PDF-Single-Page": "true",
        "X-PDF-Rotation": "-90",
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
