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

    // Get tracking number (shipping_tracking_number) - must be numeric ORDER_SEQ
    const trackingNumber = order.shipping_tracking_number;
    
    // Validate tracking number: must exist and be numeric (8-20 digits)
    if (!trackingNumber || typeof trackingNumber !== "string") {
      console.error("[yurtici-label] shipping_tracking_number bulunamadı");
      return NextResponse.json(
        { error: "Kargo kaydı oluştu. Barkod/ORDER_SEQ şube kabulünden sonra üretilecektir. Lütfen daha sonra tekrar deneyin." },
        { status: 400 }
      );
    }

    // Validate format: must be numeric, 8-20 digits (real barcode format)
    const numericRegex = /^\d{8,20}$/;
    if (!numericRegex.test(trackingNumber)) {
      console.error("[yurtici-label] shipping_tracking_number geçersiz format:", trackingNumber);
      return NextResponse.json(
        { error: "Kargo kaydı oluştu. Barkod/ORDER_SEQ şube kabulünden sonra üretilecektir. Lütfen daha sonra tekrar deneyin." },
        { status: 400 }
      );
    }

    // Generate barcode PNG using bwip-js (Code128 with text)
    let barcodePng: Buffer;
    try {
      barcodePng = await bwipjs.toBuffer({
        bcid: "code128",
        text: trackingNumber,
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

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size (width x height in points)

    // Embed barcode image
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    const barcodeDims = barcodeImage.scale(0.5);

    // Page dimensions
    const pageWidth = 595.28;
    const margin = 50;
    let yPos = 841.89 - margin; // Start from top

    // Title
    page.drawText("Lezzette Tek - Yurtiçi Kargo Etiketi", {
      x: margin,
      y: yPos,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 40;

    // CargoKey text (tracking number)
    page.drawText("Kargo Takip No:", {
      x: margin,
      y: yPos,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;

    page.drawText(trackingNumber, {
      x: margin,
      y: yPos,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 50;

    // Barcode image (centered)
    const barcodeX = (pageWidth - barcodeDims.width) / 2;
    page.drawImage(barcodeImage, {
      x: barcodeX,
      y: yPos - barcodeDims.height,
      width: barcodeDims.width,
      height: barcodeDims.height,
    });

    yPos -= barcodeDims.height + 40;

    // Receiver Information
    page.drawText("Alıcı Bilgileri", {
      x: margin,
      y: yPos,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;

    const infoSize = 12;
    page.drawText(`Ad: ${order.customer_name ?? "-"}`, {
      x: margin,
      y: yPos,
      size: infoSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 20;

    page.drawText(`Telefon: ${order.phone ?? "-"}`, {
      x: margin,
      y: yPos,
      size: infoSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 20;

    page.drawText(`Adres: ${order.address ?? "-"}`, {
      x: margin,
      y: yPos,
      size: infoSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 20;

    page.drawText(`İl/İlçe: ${order.city ?? "-"} / ${order.district ?? "-"}`, {
      x: margin,
      y: yPos,
      size: infoSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="yurtici-${trackingNumber}.pdf"`,
        "Cache-Control": "no-store",
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
