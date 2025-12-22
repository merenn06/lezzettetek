import { NextResponse } from "next/server";
import {
  createOrderWithItems,
  type CreateOrderInput,
  type OrderItemInput,
} from "@/lib/orders";

type CheckoutRequestBody = {
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  district: string;
  note?: string | null;
  payment_method: "havale" | "kapida";
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

  if (body.payment_method !== "havale" && body.payment_method !== "kapida") {
    throw new Error(
      "Geçersiz payment_method. Sadece 'havale' veya 'kapida' olabilir."
    );
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
      items,
    } = body as CheckoutRequestBody;

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
    };

    const { orderId } = await createOrderWithItems(orderData, mappedItems);

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
