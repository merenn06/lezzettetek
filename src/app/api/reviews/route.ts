import { NextResponse } from 'next/server';
import { getProductReviews } from '@/lib/reviews/actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id gerekli' },
        { status: 400 }
      );
    }

    const result = await getProductReviews(productId, limit);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[reviews-api] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Yorumlar alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
