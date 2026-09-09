"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { buildPageViewEventId } from "@/lib/meta/eventId";
import { shouldRunMetaPixel, trackMetaPageView } from "@/lib/meta/pixel";

const META_PIXEL_READY_EVENT = "meta-pixel-ready";

/**
 * Fires Meta PageView on App Router client-side navigations.
 * Initial PageView is also tracked here after fbq is ready.
 * Admin routes are excluded.
 */
export default function MetaPageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !shouldRunMetaPixel(pathname)) {
      return;
    }

    const tryTrackPageView = (): boolean => {
      if (lastTrackedPath.current === pathname) {
        return true;
      }

      if (typeof window === "undefined" || !window.fbq) {
        return false;
      }

      const eventId = buildPageViewEventId(pathname);
      const tracked = trackMetaPageView(eventId, pathname);
      if (tracked) {
        lastTrackedPath.current = pathname;
      }
      return tracked;
    };

    if (tryTrackPageView()) {
      return;
    }

    const onPixelReady = () => {
      tryTrackPageView();
    };

    window.addEventListener(META_PIXEL_READY_EVENT, onPixelReady);

    const timer = window.setInterval(() => {
      if (tryTrackPageView()) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => {
      window.removeEventListener(META_PIXEL_READY_EVENT, onPixelReady);
      window.clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
