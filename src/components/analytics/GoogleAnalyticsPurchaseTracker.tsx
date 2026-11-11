"use client";

import { useEffect, useRef } from "react";
import { getGtag } from "@/lib/analytics/gtag";
import {
  buildGa4PurchasePayload,
  resolveGoogleAdsPurchaseSendTo,
  sendGa4PurchaseEvent,
  sendGoogleAdsPurchaseConversion,
  type Ga4PurchaseLineItem,
} from "@/lib/analytics/ga4-purchase";

type GoogleAnalyticsPurchaseTrackerProps = {
  orderId: string;
  totalPrice: number;
  items: Ga4PurchaseLineItem[];
};

function getSessionStorageKey(orderId: string): string {
  return `ga4_purchase_${orderId}`;
}

export default function GoogleAnalyticsPurchaseTracker({
  orderId,
  totalPrice,
  items,
}: GoogleAnalyticsPurchaseTrackerProps) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;

    const payload = buildGa4PurchasePayload(orderId, totalPrice, items);
    if (!payload) return;

    const storageKey = getSessionStorageKey(orderId);
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        attemptedRef.current = true;
        return;
      }
    } catch {
      // sessionStorage yoksa yine de tek seferlik göndermeye çalış
    }

    const gtag = getGtag();
    if (!gtag) {
      console.warn("[ga4-purchase] gtag bulunamadı; purchase gönderilmedi.", {
        orderId,
      });
      return;
    }

    sendGa4PurchaseEvent(gtag, payload);

    const adsSendTo = resolveGoogleAdsPurchaseSendTo();
    if (adsSendTo) {
      sendGoogleAdsPurchaseConversion(gtag, adsSendTo, payload);
    }

    attemptedRef.current = true;
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  }, [orderId, totalPrice, items]);

  return null;
}
