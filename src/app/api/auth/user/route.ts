import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/actions';

export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
