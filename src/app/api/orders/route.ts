import { NextResponse } from "next/server";
import {
  createOrderWithItems,
  type CreateOrderInput,
  type OrderItemInput,
} from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/mailer";

type CheckoutRequestBody = {
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  district: string;
  note?: string | null;
  payment_method: "havale" | "kapida" | "iyzico" | "cod";
  shipping_payment_type?: "cash" | "card" | null; // COD tahsilat tipi (nakit/kart)
  invoice_type?: "individual" | "corporate";
  invoice_company_name?: string | null;
  invoice_tax_number?: string | null;
  invoice_tax_office?: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }>;
};

function validateRequest(body: any): asserts body is CheckoutRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Geçersiz istek gövdesi.");
  }

  const requiredFields: Array<keyof CheckoutRequestBody> = [
    "customer_name",
    "phone",
    "address",
    "city",
    "district",
    "payment_method",
    "items",
  ];

  for (const field of requiredFields) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      (typeof body[field] === "string" && body[field].trim() === "")
    ) {
      throw new Error(`Geçersiz istek: '${field}' alanı zorunludur.`);
    }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("Geçersiz istek: 'items' dizisi boş olamaz.");
  }

  for (const [index, item] of body.items.entries()) {
    if (!item.product_id || !item.product_name) {
      throw new Error(
        `Geçersiz ürün satırı (index ${index}): product_id ve product_name zorunlu.`
      );
    }
    if (typeof item.unit_price !== "number" || isNaN(item.unit_price)) {
      throw new Error(
        `Geçersiz ürün satırı (index ${index}): unit_price sayısal olmalı.`
      );
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new Error(
        `Geçersiz ürün satırı (index ${index}): quantity 0'dan büyük olmalı.`
      );
    }
  }

  if (body.payment_method !== "havale" && body.payment_method !== "kapida" && body.payment_method !== "iyzico" && body.payment_method !== "cod") {
    throw new Error(
      "Geçersiz payment_method. Sadece 'havale', 'kapida', 'iyzico' veya 'cod' olabilir."
    );
  }

  const invoiceType = body.invoice_type || "individual";
  if (invoiceType !== "individual" && invoiceType !== "corporate") {
    throw new Error("Geçersiz invoice_type. Sadece 'individual' veya 'corporate' olabilir.");
  }

  if (invoiceType === "corporate") {
    const companyName = String(body.invoice_company_name || "").trim();
    const taxOffice = String(body.invoice_tax_office || "").trim();
    const taxNumber = String(body.invoice_tax_number || "").trim();

    if (!companyName) {
      throw new Error("Geçersiz istek: 'invoice_company_name' alanı zorunludur.");
    }
    if (!taxOffice) {
      throw new Error("Geçersiz istek: 'invoice_tax_office' alanı zorunludur.");
    }
    if (!taxNumber) {
      throw new Error("Geçersiz istek: 'invoice_tax_number' alanı zorunludur.");
    }
    if (!/^\d+$/.test(taxNumber) || !(taxNumber.length === 10 || taxNumber.length === 11)) {
      throw new Error("Vergi numarası 10 (VKN) veya 11 (TCKN) haneli olmalıdır.");
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    validateRequest(body);

    const {
      customer_name,
      phone,
      email = null,
      address,
      city,
      district,
      note = null,
      payment_method,
      shipping_payment_type: rawShippingPaymentType = null,
      invoice_type = "individual",
      invoice_company_name = null,
      invoice_tax_number = null,
      invoice_tax_office = null,
      items,
    } = body as CheckoutRequestBody;

    // Validate and normalize shipping_payment_type
    // Only allow "cash" or "card", default to null for non-COD orders
    let shipping_payment_type: "cash" | "card" | null = null;
    if (rawShippingPaymentType === "cash" || rawShippingPaymentType === "card") {
      shipping_payment_type = rawShippingPaymentType;
    } else if (rawShippingPaymentType !== null && rawShippingPaymentType !== undefined) {
      // Invalid value, log warning but don't fail
      console.warn(`[orders-api] Invalid shipping_payment_type: ${rawShippingPaymentType}, defaulting to null`);
    }

    const mappedItems: OrderItemInput[] = items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
    }));

    const orderData: CreateOrderInput = {
      customer_name,
      phone,
      email,
      address,
      city,
      district,
      note,
      payment_method,
      shipping_payment_type, // COD tahsilat tipi (cash/card)
      invoice_type,
      invoice_company_name,
      invoice_tax_number,
      invoice_tax_office,
    };

    const { orderId } = await createOrderWithItems(orderData, mappedItems);

    // Send confirmation email if email is provided
    if (email) {
      try {
        const totalPrice = mappedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        await sendOrderConfirmationEmail({
          to: email,
          orderId,
          customerName: customer_name,
          totalPrice,
          items: mappedItems.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        });
      } catch (mailErr) {
        // Log email error but don't fail the order creation
        console.error("[order-confirmation-mail] failed:", mailErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        message: "Siparişiniz başarıyla oluşturuldu.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Sipariş oluşturma hatası:", error);
    const message =
      error?.message || "Sipariş oluşturulurken bilinmeyen bir hata oluştu.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
