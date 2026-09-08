"use client";

import { useEffect, useRef } from "react";
import { META_EVENT_NAMES } from "@/lib/meta/constants";
import { buildPurchaseEventId } from "@/lib/meta/eventId";
import { trackMetaPixelEvent } from "@/lib/meta/pixel";

export type MetaPurchaseTrackerItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type MetaPurchaseTrackerProps = {
  orderId: string;
  totalPrice: number;
  items: MetaPurchaseTrackerItem[];
};

function getSessionStorageKey(orderId: string): string {
  return `meta_purchase_${orderId}`;
}

export default function MetaPurchaseTracker({
  orderId,
  totalPrice,
  items,
}: MetaPurchaseTrackerProps) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!orderId || totalPrice <= 0 || items.length === 0) return;

    const storageKey = getSessionStorageKey(orderId);
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        attemptedRef.current = true;
        return;
      }
    } catch {
      // sessionStorage unavailable — continue without dedup persistence
    }

    const contentIds = items
      .map((item) => item.productId)
      .filter((id) => Boolean(id));
    if (contentIds.length === 0) return;

    const numItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (numItems <= 0) return;

    const contents = items.map((item) => ({
      id: item.productId,
      quantity: item.quantity,
      item_price: item.unitPrice,
    }));

    const eventId = buildPurchaseEventId(orderId);
    const tracked = trackMetaPixelEvent(
      META_EVENT_NAMES.PURCHASE,
      {
        value: totalPrice,
        currency: "TRY",
        content_ids: contentIds,
        content_type: "product",
        num_items: numItems,
        contents,
      },
      eventId
    );

    attemptedRef.current = true;

    if (tracked) {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // ignore sessionStorage write errors
      }
    }
  }, [orderId, totalPrice, items]);

  return null;
}
