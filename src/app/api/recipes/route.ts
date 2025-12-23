import { NextResponse } from 'next/server';
import { getRecipes } from '@/lib/recipes';

export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json({ success: true, recipes });
  } catch (error) {
    console.error('Recipes API error:', error);
    return NextResponse.json(
      { success: false, error: 'Tarifler yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
