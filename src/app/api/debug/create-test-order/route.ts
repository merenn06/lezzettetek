import { NextResponse } from 'next/server';
import { createOrderWithItems, type CreateOrderInput, type OrderItemInput } from '@/lib/orders';
import { supabase } from '@/lib/supabaseClient';

async function createTestOrderResponse() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase client başlatılamadı. Env değişkenlerini kontrol et.' },
        { status: 500 }
      );
    }

    // Get a product from the database for testing
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(1);

    if (productsError) {
      return NextResponse.json(
        { success: false, error: `Ürünler yüklenirken hata: ${productsError.message}` },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Test ürünü bulunamadı' },
        { status: 500 }
      );
    }

    const testProduct = products[0];

    // Test order data
    const orderData: CreateOrderInput = {
      customer_name: 'Test Müşteri',
      phone: '0555 000 00 00',
      email: 'test@example.com',
      address: 'Test Mah. Test Sok. No:1',
      city: 'İstanbul',
      district: 'Ataşehir',
      note: 'Bu bir test siparişidir.',
      payment_method: 'havale',
    };

    // Test items
    const items: OrderItemInput[] = [
      {
        product_id: testProduct.id,
        product_name: testProduct.name,
        unit_price: testProduct.price,
        quantity: 2,
      },
    ];

    const result = await createOrderWithItems(orderData, items);

    return NextResponse.json(
      { success: true, orderId: result.orderId },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
    console.error('Test order creation error:', err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return createTestOrderResponse();
}

export async function POST() {
  return createTestOrderResponse();
}


