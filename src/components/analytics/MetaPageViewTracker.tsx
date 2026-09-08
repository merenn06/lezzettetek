"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { buildPageViewEventId } from "@/lib/meta/eventId";
import { shouldRunMetaPixel, trackMetaPageView } from "@/lib/meta/pixel";

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

    if (lastTrackedPath.current === pathname) {
      return;
    }

    const fire = () => {
      const eventId = buildPageViewEventId(pathname);
      const tracked = trackMetaPageView(eventId, pathname);
      if (tracked) {
        lastTrackedPath.current = pathname;
      }
    };

    // fbq may not be ready immediately after Script load on first paint.
    if (typeof window !== "undefined" && window.fbq) {
      fire();
      return;
    }

    const timer = window.setInterval(() => {
      if (window.fbq) {
        window.clearInterval(timer);
        fire();
      }
    }, 100);

    const timeout = window.setTimeout(() => {
      window.clearInterval(timer);
    }, 5000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
