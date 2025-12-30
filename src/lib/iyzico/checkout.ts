import { getIyzipayClient } from './client';
import type { IyzicoRetrieveResult } from './types';

/**
 * Retrieves checkout form result using token
 * Includes explicit guards to prevent "Cannot read properties of undefined" errors
 */
export function retrieveCheckoutForm(token: string): Promise<IyzicoRetrieveResult> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Token is required and must be a non-empty string');
  }

  return new Promise<IyzicoRetrieveResult>((resolve, reject) => {
    try {
      // Get client instance (singleton)
      const iyzipay = getIyzipayClient();

      // Guard: Ensure client is not undefined
      if (!iyzipay) {
        const error = new Error('iyzipay client is undefined - cannot retrieve checkout form');
        console.error('[iyzico-checkout] Client is undefined');
        reject(error);
        return;
      }

      // Guard: Ensure checkoutForm exists
      if (!iyzipay.checkoutForm) {
        const availableKeys = Object.keys(iyzipay || {});
        const error = new Error(
          `iyzipay.checkoutForm is undefined. Available keys on iyzipay client: ${JSON.stringify(availableKeys)}`
        );
        console.error('[iyzico-checkout] checkoutForm is undefined. Client keys:', availableKeys);
        reject(error);
        return;
      }

      // Guard: Ensure retrieve method exists
      if (typeof iyzipay.checkoutForm.retrieve !== 'function') {
        const availableMethods = Object.keys(iyzipay.checkoutForm || {});
        const error = new Error(
          `iyzipay.checkoutForm.retrieve is not a function. Available methods on checkoutForm: ${JSON.stringify(availableMethods)}`
        );
        console.error('[iyzico-checkout] retrieve is not a function. checkoutForm methods:', availableMethods);
        reject(error);
        return;
      }

      const request = {
        token: token.trim(),
      };

      // Call retrieve with explicit error handling
      iyzipay.checkoutForm.retrieve(request, (err: unknown, result: IyzicoRetrieveResult) => {
        if (err) {
          console.error('[iyzico-checkout] retrieve callback error:', err);
          reject(err);
          return;
        }
        if (result) {
          resolve(result);
        } else {
          const error = new Error('No result from iyzico retrieve - result is undefined');
          console.error('[iyzico-checkout] No result from iyzico');
          reject(error);
        }
      });
    } catch (error) {
      // Catch any synchronous errors (e.g., from getIyzipayClient)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in retrieveCheckoutForm';
      console.error('[iyzico-checkout] Synchronous error:', errorMessage);
      reject(error);
    }
  });
}

