import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { retrieveCheckoutForm } from '@/lib/iyzico/checkout';
import type { IyzicoRetrieveResult } from '@/lib/iyzico/types';

const sb = supabase!;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Gets the origin URL from request headers (proxy-aware)
 * Uses x-forwarded-proto + x-forwarded-host if available, otherwise req.nextUrl.origin
 */
function getOrigin(req: NextRequest): string {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  return req.nextUrl.origin;
}

/**
 * Creates a redirect response with 303 status code
 */
function createRedirect(req: NextRequest, path: string): NextResponse {
  const origin = getOrigin(req);
  const url = new URL(path, origin);
  return NextResponse.redirect(url, { status: 303 });
}

/**
 * Extracts token from POST form data (application/x-www-form-urlencoded)
 * Iyzico sends token in form data after 3DS authentication
 */
async function extractTokenFromForm(req: NextRequest): Promise<string | null> {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('application/x-www-form-urlencoded')) {
      return null;
    }

    const formData = await req.formData();
    const token = formData.get('token') as string | null;
    
    if (token && typeof token === 'string' && token.trim().length > 0) {
      console.log('[iyzico-callback] ✅ Token found in form data');
      return token.trim();
    }

    // Log form data keys for debugging
    const formKeys = Array.from(formData.keys());
    console.log('[iyzico-callback] Form data keys:', formKeys);
    
    return null;
  } catch (error) {
    console.error('[iyzico-callback] Error reading form data:', error);
    return null;
  }
}

/**
 * Handles GET requests (user refresh or direct access)
 */
export async function GET(req: NextRequest): Promise<Response> {
  const orderId = req.nextUrl.searchParams.get('orderId');
  const redirectPath = orderId 
    ? `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent('missing_token')}`
    : '/odeme-basarisiz?reason=' + encodeURIComponent('missing_token');
  
  console.log('[iyzico-callback] GET request - redirecting to failure page');
  return createRedirect(req, redirectPath);
}

/**
 * Handles POST requests from Iyzico (3DS callback)
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    console.log('[iyzico-callback] ========== CALLBACK RECEIVED ==========');
    console.log('[iyzico-callback] Method: POST');
    
    // Get orderId from query params
    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) {
      console.error('[iyzico-callback] ❌ orderId bulunamadı in query params');
      return createRedirect(req, '/odeme-basarisiz?reason=' + encodeURIComponent('missing_order_id'));
    }

    console.log('[iyzico-callback] Order ID from query:', orderId);

    // Extract token from form data
    const token = await extractTokenFromForm(req);

    if (!token || typeof token !== 'string') {
      console.error('[iyzico-callback] ❌ Token bulunamadı in form data');
      return createRedirect(req, `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent('missing_token')}`);
    }

    console.log('[iyzico-callback] Token extracted:', token.substring(0, 20) + '...');

    // Retrieve payment result from iyzico
    console.log('[iyzico-callback] Retrieving checkout form from iyzico');
    let result: IyzicoRetrieveResult;
    
    try {
      result = await retrieveCheckoutForm(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ödeme sorgulanamadı';
      console.error('[iyzico-callback] iyzico retrieve error:', errorMessage);
      return createRedirect(req, `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(errorMessage)}`);
    }

    if (result.status !== 'success') {
      const errorMessage = result.errorMessage || 'Ödeme sorgulanamadı';
      console.error('[iyzico-callback] iyzico retrieve failed:', errorMessage);
      
      // Update order with failure status
      try {
        await sb
          .from('orders')
          .update({
            status: 'payment_failed',
            payment_provider: 'iyzico',
            payment_token: token,
            payment_status: 'failed',
            iyzico_payment_id: result.paymentId || null,
          })
          .eq('id', orderId);
      } catch (err) {
        console.error('[iyzico-callback] Order update error:', err);
      }

      return createRedirect(req, `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(errorMessage)}`);
    }

    const paymentStatus = result.paymentStatus;
    const conversationId = result.conversationId;
    const paymentId = result.paymentId;
    const paidPrice = result.paidPrice;

    console.log('[iyzico-callback] Payment status:', paymentStatus);
    console.log('[iyzico-callback] Order ID (conversationId):', conversationId);
    console.log('[iyzico-callback] Payment ID:', paymentId);
    console.log('[iyzico-callback] Paid price:', paidPrice);

    // Verify conversationId matches orderId (security check)
    if (conversationId && conversationId !== orderId) {
      console.warn('[iyzico-callback] conversationId mismatch:', conversationId, 'vs', orderId);
    }

    // Update order based on payment status
    if (paymentStatus === 'SUCCESS') {
      console.log(`[iyzico-callback] Payment successful for order ${orderId}`);
      
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
        updateData.total_price = parseFloat(paidPrice);
      }

      const { error: updateError } = await sb
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.error('[iyzico-callback] Order update error:', updateError);
        // Still redirect to success page, but log the error
        return createRedirect(req, `/tesekkurler?orderId=${encodeURIComponent(orderId)}`);
      }

      console.log(`[iyzico-callback] Order ${orderId} updated successfully as paid`);
      return createRedirect(req, `/tesekkurler?orderId=${encodeURIComponent(orderId)}`);
    } else {
      // Payment failed
      const failureMessage = result.errorMessage || `Ödeme başarısız: ${paymentStatus}`;
      console.log(`[iyzico-callback] Payment failed for order ${orderId}, status: ${paymentStatus}`);
      
      const updateData: any = {
        status: 'payment_failed',
        payment_provider: 'iyzico',
        payment_token: token,
        payment_status: 'failed',
        iyzico_payment_id: paymentId || null,
      };

      // Store error message if we have a column for it
      if (result.errorMessage) {
        updateData.payment_error_message = result.errorMessage;
      }
      if (result.errorCode) {
        updateData.payment_error_code = result.errorCode;
      }

      try {
        await sb
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
      } catch (err) {
        console.error('[iyzico-callback] Order update error:', err);
      }

      console.log(`[iyzico-callback] Order ${orderId} updated as payment_failed`);
      return createRedirect(req, `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(failureMessage)}`);
    }
  } catch (error) {
    console.error('[iyzico-callback] Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[iyzico-callback] Error stack:', errorStack);
    
    // Try to get orderId from query params for redirect
    const orderId = req.nextUrl.searchParams.get('orderId');
    const redirectPath = orderId
      ? `/odeme-basarisiz?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(errorMessage)}`
      : `/odeme-basarisiz?reason=${encodeURIComponent(errorMessage)}`;
    
    return createRedirect(req, redirectPath);
  }
}
