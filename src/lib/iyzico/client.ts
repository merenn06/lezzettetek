import Iyzipay from 'iyzipay';
import type { IyzicoRetrieveResult, IyzicoCheckoutFormRequest, IyzicoCheckoutFormResult } from './types';

/**
 * Creates and returns an iyzico client instance
 * Validates environment variables and logs configuration
 * Note: This function uses iyzipay package which is marked as external in next.config.js
 */
export function getIyzipayClient(): any {
  const apiKey = process.env.IYZI_API_KEY?.trim();
  const secretKey = process.env.IYZI_SECRET_KEY?.trim();
  const baseUrl = (process.env.IYZI_BASE_URL || 'https://sandbox-api.iyzipay.com').trim();

  if (!apiKey || !secretKey) {
    console.error('[iyzico] Missing IYZI_API_KEY or IYZI_SECRET_KEY');
    throw new Error('IYZI_API_KEY ve IYZI_SECRET_KEY env değişkenleri tanımlı olmalıdır.');
  }

  // Check if base URL and key type match
  const isSandbox = baseUrl.includes('sandbox');
  const isLive = baseUrl.includes('api.iyzipay.com') && !baseUrl.includes('sandbox');
  
  // Log API key presence (not the actual values for security)
  console.log('[iyzico] API Key present:', !!apiKey, 'Length:', apiKey?.length);
  console.log('[iyzico] Secret Key present:', !!secretKey, 'Length:', secretKey?.length);
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
  
  return new Iyzipay({
    apiKey,
    secretKey,
    uri: baseUrl,
  });
}

/**
 * Creates a checkout form initialization request
 */
export function createCheckoutForm(
  iyzipay: any,
  request: IyzicoCheckoutFormRequest
): Promise<IyzicoCheckoutFormResult> {
  return new Promise<IyzicoCheckoutFormResult>((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err: unknown, result: IyzicoCheckoutFormResult) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * Retrieves checkout form result using token
 */
export function retrieveCheckoutForm(token: string): Promise<IyzicoRetrieveResult> {
  return new Promise<IyzicoRetrieveResult>((resolve, reject) => {
    const iyzipay = getIyzipayClient();
    const request = {
      token: token,
    };

    iyzipay.checkoutForm.retrieve(request, (err: unknown, result: IyzicoRetrieveResult) => {
      if (err) {
        reject(err);
        return;
      }
      if (result) {
        resolve(result);
      } else {
        reject(new Error('No result from iyzico'));
      }
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

