"use client";

import { useEffect, useRef } from "react";
import {
  createViewContentTrackState,
  scheduleViewContentUntilReady,
  type MetaViewContentParams,
  type ViewContentTrackState,
} from "@/lib/meta/track-view-content";

/**
 * Gerçek ürün detay sayfası görüntülemesinde tek ViewContent (liste sayfası değil).
 */
export function useMetaViewContent(params: MetaViewContentParams | null): void {
  const trackStateRef = useRef<ViewContentTrackState | null>(null);
  const trackedProductIdRef = useRef<string | null>(null);

  const productId = params?.productId;

  useEffect(() => {
    if (!params?.productId || !params.productName || typeof params.price !== "number") {
      return;
    }

    const sameProductSession = trackedProductIdRef.current === params.productId;
    const existingState = trackStateRef.current;

    // React Strict Mode: effect cleanup + re-run aynı mount’ta; tamamlanmış görüntülemeyi tekrar gönderme.
    if (sameProductSession && existingState?.completed) {
      return;
    }

    const state =
      sameProductSession && existingState && !existingState.completed
        ? existingState
        : createViewContentTrackState(params.productId);

    trackStateRef.current = state;
    trackedProductIdRef.current = params.productId;

    const safeParams: MetaViewContentParams = {
      productId: params.productId,
      productName: params.productName,
      price: params.price,
      pathname: params.pathname,
    };

    return scheduleViewContentUntilReady(safeParams, state, () => {});
  }, [productId, params?.productName, params?.price, params?.pathname, params?.productId]);
}