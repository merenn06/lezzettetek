import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { retrieveCheckoutForm } from '@/lib/iyzico/checkout';
import type { IyzicoRetrieveResult } from '@/lib/iyzico/types';

const sb = supabase!;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractToken(req: NextRequest): Promise<string | null> {
  // 1. Try query parameters first (most common for iyzico callbacks - GET requests)
  // Check multiple possible parameter names
  const possibleTokenParams = ['token', 'paymentToken', 'checkoutToken', 'iyzicoToken'];
  for (const paramName of possibleTokenParams) {
    const queryToken = req.nextUrl.searchParams.get(paramName);
    if (queryToken) {
      console.log(`[iyzico-callback] ✅ Token found in query parameters as "${paramName}"`);
      return queryToken;
    }
  }
  
  // Log all query parameters for debugging
  const allQueryParams = Object.fromEntries(req.nextUrl.searchParams);
  if (Object.keys(allQueryParams).length > 0) {
    console.log('[iyzico-callback] All query parameters:', allQueryParams);
  }

  // For POST requests, try body (can only read once, so check content-type first)
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    console.log('[iyzico-callback] POST request, Content-Type:', contentType);
    
    // 2. Try form data if content-type is application/x-www-form-urlencoded
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        // Check all possible token parameter names
        for (const paramName of possibleTokenParams) {
          const formToken = formData.get(paramName) as string | null;
          if (formToken) {
            console.log(`[iyzico-callback] ✅ Token found in form data as "${paramName}"`);
            return formToken;
          }
        }
        // Also check all form data keys for debugging
        const formKeys = Array.from(formData.keys());
        console.log('[iyzico-callback] Form data keys:', formKeys);
        console.log('[iyzico-callback] Form data values:', formKeys.map(key => ({ key, value: formData.get(key) })));
      } catch (error) {
        console.error('[iyzico-callback] Error reading form data:', error);
      }
    }
    // 3. Try JSON body (only for POST with JSON content-type)
    else if (contentType.includes('application/json')) {
      try {
        const body = await req.json();
        console.log('[iyzico-callback] JSON body received, keys:', Object.keys(body || {}));
        // Check all possible token parameter names
        for (const paramName of possibleTokenParams) {
          if (body && typeof body === 'object' && body[paramName]) {
            console.log(`[iyzico-callback] ✅ Token found in JSON body as "${paramName}"`);
            return body[paramName];
          }
        }
        // Log full body for debugging (first level only)
        console.log('[iyzico-callback] JSON body content:', JSON.stringify(body).substring(0, 500));
      } catch (error) {
        console.error('[iyzico-callback] Error reading JSON body:', error);
      }
    }
    // 4. If content-type is missing or unknown, try reading as text (URL-encoded format)
    else if (!contentType || contentType === '') {
      try {
        const text = await req.text();
        console.log('[iyzico-callback] Body as text (first 500 chars):', text.substring(0, 500));
        // Try to parse as URL-encoded for all possible token parameter names
        for (const paramName of possibleTokenParams) {
          const regex = new RegExp(`${paramName}=([^&\\s]+)`);
          const tokenMatch = text.match(regex);
          if (tokenMatch && tokenMatch[1]) {
            console.log(`[iyzico-callback] ✅ Token found in text body as "${paramName}" (URL-encoded)`);
            return decodeURIComponent(tokenMatch[1]);
          }
        }
      } catch (error) {
        console.error('[iyzico-callback] Error reading body as text:', error);
      }
    }
  }

  return null;
}

async function handleCallback(req: NextRequest): Promise<Response> {
  try {
    console.log('[iyzico-callback] ========== CALLBACK RECEIVED ==========');
    console.log('[iyzico-callback] Method:', req.method);
    console.log('[iyzico-callback] Full URL:', req.url);
    console.log('[iyzico-callback] Pathname:', req.nextUrl.pathname);
    console.log('[iyzico-callback] Query params:', Object.fromEntries(req.nextUrl.searchParams));
    console.log('[iyzico-callback] Query string:', req.nextUrl.search);
    console.log('[iyzico-callback] Content-Type:', req.headers.get('content-type'));
    console.log('[iyzico-callback] All headers:', Object.fromEntries(req.headers.entries()));

    // Extract token from different sources
    const token = await extractToken(req);

    if (!token || typeof token !== 'string') {
      console.error('[iyzico-callback] ❌ Token bulunamadı!');
      console.error('[iyzico-callback] Query params:', Object.fromEntries(req.nextUrl.searchParams));
      console.error('[iyzico-callback] Query string:', req.nextUrl.search);
      console.error('[iyzico-callback] Content-Type:', req.headers.get('content-type'));
      console.error('[iyzico-callback] Method:', req.method);
      
      // For debugging: log raw URL
      console.error('[iyzico-callback] Raw URL:', req.url);
      
      return NextResponse.json(
        { status: 'error', message: 'Token bulunamadı' },
        { status: 400 }
      );
    }

    console.log('[iyzico-callback] Token extracted:', token.substring(0, 20) + '...');

    // Retrieve payment result from iyzico
    console.log('[iyzico-callback] Retrieving checkout form from iyzico');
    const result = await retrieveCheckoutForm(token);

    if (result.status !== 'success') {
      console.error('[iyzico-callback] iyzico retrieve failed:', result.errorMessage, 'Full result:', JSON.stringify(result));
      return NextResponse.json(
        { status: 'error', message: result.errorMessage || 'Ödeme sorgulanamadı' },
        { status: 500 }
      );
    }

    const paymentStatus = result.paymentStatus;
    const conversationId = result.conversationId;
    const paymentId = result.paymentId;
    const paidPrice = result.paidPrice;

    console.log('[iyzico-callback] Payment status:', paymentStatus);
    console.log('[iyzico-callback] Order ID (conversationId):', conversationId);
    console.log('[iyzico-callback] Payment ID:', paymentId);
    console.log('[iyzico-callback] Paid price:', paidPrice);

    if (!conversationId) {
      console.error('[iyzico-callback] conversationId bulunamadı, result:', JSON.stringify(result));
      return NextResponse.json(
        { status: 'error', message: 'Sipariş ID bulunamadı' },
        { status: 400 }
      );
    }

    // Update order based on payment status
    if (paymentStatus === 'SUCCESS') {
      console.log(`[iyzico-callback] Payment successful for order ${conversationId}`);
      
      const updateData: any = {
        status: 'paid',
        payment_provider: 'iyzico',
        payment_token: token,
        payment_status: 'success',
        paid_at: new Date().toISOString(),
        iyzico_payment_id: paymentId || null,
      };

      // Add paidPrice if available
      if (paidPrice) {
        // Note: iyzico returns paidPrice as string, we can store it as is or convert
        // For now, we'll store it in a note or custom field if you have one
        // If you have a paid_price column, uncomment below:
        // updateData.paid_price = parseFloat(paidPrice);
      }

      const { error: updateError } = await sb
        .from('orders')
        .update(updateData)
        .eq('id', conversationId);

      if (updateError) {
        console.error('[iyzico-callback] Order update error:', updateError);
        return NextResponse.json(
          { status: 'error', message: 'Sipariş güncellenemedi' },
          { status: 500 }
        );
      }

      console.log(`[iyzico-callback] Order ${conversationId} updated successfully as paid`);
      return NextResponse.json(
        { status: 'success', message: 'Ödeme başarılı', orderId: conversationId },
        { status: 200 }
      );
    } else {
      console.log(`[iyzico-callback] Payment failed for order ${conversationId}, status: ${paymentStatus}`);
      
      const updateData: any = {
        status: 'payment_failed',
        payment_provider: 'iyzico',
        payment_token: token,
        payment_status: 'failed',
        iyzico_payment_id: paymentId || null,
      };

      const { error: updateError } = await sb
        .from('orders')
        .update(updateData)
        .eq('id', conversationId);

      if (updateError) {
        console.error('[iyzico-callback] Order update error:', updateError);
        return NextResponse.json(
          { status: 'error', message: 'Sipariş güncellenemedi' },
          { status: 500 }
        );
      }

      console.log(`[iyzico-callback] Order ${conversationId} updated as payment_failed`);
      return NextResponse.json(
        { status: 'failed', message: 'Ödeme başarısız', orderId: conversationId },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[iyzico-callback] Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[iyzico-callback] Error stack:', errorStack);
    return NextResponse.json(
      { status: 'error', message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleCallback(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleCallback(req);
}
