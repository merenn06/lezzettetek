import type { IyzicoRetrieveResult, IyzicoCheckoutFormRequest, IyzicoCheckoutFormResult } from './types';

// Use CommonJS require for iyzipay to ensure compatibility
let Iyzipay: any;
let iyzipayClientInstance: any = null;

/**
 * Lazy load iyzipay using CommonJS require
 * This ensures compatibility with Next.js server-side rendering
 */
function loadIyzipay(): any {
  if (!Iyzipay) {
    try {
      // Use require() instead of import for CommonJS compatibility
      Iyzipay = require('iyzipay');
      if (!Iyzipay) {
        throw new Error('Failed to load iyzipay module - require() returned undefined');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[iyzico] Failed to require iyzipay:', errorMessage);
      throw new Error(`Failed to load iyzipay module: ${errorMessage}`);
    }
  }
  return Iyzipay;
}

/**
 * Creates and returns an iyzico client instance (Singleton pattern)
 * Validates environment variables and logs configuration
 * NEVER returns undefined - throws explicit error if misconfigured
 */
export function getIyzipayClient(): any {
  // Return singleton instance if already created
  if (iyzipayClientInstance) {
    return iyzipayClientInstance;
  }

  const apiKey = process.env.IYZI_API_KEY?.trim();
  const secretKey = process.env.IYZI_SECRET_KEY?.trim();
  const baseUrl = (process.env.IYZI_BASE_URL || 'https://sandbox-api.iyzipay.com').trim();

  // Explicit validation - throw error if missing
  if (!apiKey || apiKey.length === 0) {
    const error = new Error('IYZI_API_KEY env değişkeni tanımlı olmalıdır ve boş olamaz.');
    console.error('[iyzico] Missing IYZI_API_KEY');
    throw error;
  }

  if (!secretKey || secretKey.length === 0) {
    const error = new Error('IYZI_SECRET_KEY env değişkeni tanımlı olmalıdır ve boş olamaz.');
    console.error('[iyzico] Missing IYZI_SECRET_KEY');
    throw error;
  }

  // Check if base URL and key type match
  const isSandbox = baseUrl.includes('sandbox');
  const isLive = baseUrl.includes('api.iyzipay.com') && !baseUrl.includes('sandbox');
  
  // Log API key presence (not the actual values for security)
  console.log('[iyzico] API Key present: true, Length:', apiKey.length);
  console.log('[iyzico] Secret Key present: true, Length:', secretKey.length);
  console.log('[iyzico] Using iyzico base URL:', baseUrl);
  console.log('[iyzico] Environment detected:', isSandbox ? 'SANDBOX' : isLive ? 'LIVE' : 'UNKNOWN');
  
  // Warn if URL and key type might be mismatched
  if (isSandbox) {
    console.log('[iyzico] ⚠️  SANDBOX ortamı kullanılıyor - Sandbox API key\'leri kullanıldığından emin olun!');
  } else if (isLive) {
    console.log('[iyzico] ⚠️  LIVE/PRODUCTION ortamı kullanılıyor - Production API key\'leri kullanıldığından emin olun!');
  } else {
    console.warn('[iyzico] ⚠️  UYARI: Base URL tanımlanamadı. Sandbox mı Live mı kontrol edin!');
  }

  // Load iyzipay module
  const IyzipayClass = loadIyzipay();
  
  // Create client instance
  const client = new IyzipayClass({
    apiKey,
    secretKey,
    uri: baseUrl,
  });

  // Validate client was created
  if (!client) {
    throw new Error('Failed to create iyzipay client instance - constructor returned undefined');
  }

  // Store as singleton
  iyzipayClientInstance = client;
  return iyzipayClientInstance;
}

/**
 * Creates a checkout form initialization request
 */
export function createCheckoutForm(
  iyzipay: any,
  request: IyzicoCheckoutFormRequest
): Promise<IyzicoCheckoutFormResult> {
  if (!iyzipay) {
    throw new Error('iyzipay client is undefined - cannot create checkout form');
  }

  if (!iyzipay.checkoutFormInitialize) {
    const availableKeys = Object.keys(iyzipay || {});
    throw new Error(
      `iyzipay.checkoutFormInitialize is undefined. Available keys on iyzipay: ${JSON.stringify(availableKeys)}`
    );
  }

  if (typeof iyzipay.checkoutFormInitialize.create !== 'function') {
    const availableMethods = Object.keys(iyzipay.checkoutFormInitialize || {});
    throw new Error(
      `iyzipay.checkoutFormInitialize.create is not a function. Available methods: ${JSON.stringify(availableMethods)}`
    );
  }

  return new Promise<IyzicoCheckoutFormResult>((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err: unknown, result: IyzicoCheckoutFormResult) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * Formats date for iyzico API: YYYY-MM-DD HH:mm:ss
 */
export function formatIyzicoDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().slice(0, 19).replace('T', ' ');
}
