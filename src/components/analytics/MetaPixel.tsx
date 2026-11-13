"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { getPublicPixelId, isAdminPath, isMetaPixelEnabled } from "@/lib/meta/constants";

/**
 * Meta Pixel base script — admin rotalarında yüklenmez.
 * PageView: MetaPageViewTracker (App Router geçişleri + ilk yükleme).
 */
export default function MetaPixel() {
  const pathname = usePathname() ?? "";
  const pixelId = getPublicPixelId();
  const enabled =
    isMetaPixelEnabled() && Boolean(pixelId) && !isAdminPath(pathname);

  if (!enabled || !pixelId) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          if (!window.__tekLezzetMetaPixelInitId) {
            fbq('init', '${pixelId}');
            window.__tekLezzetMetaPixelInitId = '${pixelId}';
          } else if (window.__tekLezzetMetaPixelInitId !== '${pixelId}') {
            console.warn('[meta] Pixel already initialized with a different ID; reload the page after updating env.');
          }
          window.dispatchEvent(new CustomEvent('meta-pixel-ready'));
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
