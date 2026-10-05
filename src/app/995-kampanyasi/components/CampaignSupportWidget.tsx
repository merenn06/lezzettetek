'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const WHATSAPP_NUMBER = '905532350634';
const PHONE_HREF = 'tel:+905532350634';
const WHATSAPP_MESSAGE = encodeURIComponent(
  'Merhaba, 995 TL kampanyası hakkında yardım almak istiyorum.'
);
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const SCROLL_DIM_THRESHOLD = 72;
const SCROLL_IDLE_MS = 850;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

export default function CampaignSupportWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const lastScrollY = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleUndim = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      setIsDimmed(false);
    }, SCROLL_IDLE_MS);
  }, [clearIdleTimer]);

  useEffect(() => {
    const onScroll = () => {
      if (isOpen) return;

      const y = window.scrollY;
      const scrollingDown = y > lastScrollY.current + 2;

      if (scrollingDown && y > SCROLL_DIM_THRESHOLD) {
        setIsDimmed(true);
      }

      lastScrollY.current = y;
      scheduleIdleUndim();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearIdleTimer();
    };
  }, [isOpen, scheduleIdleUndim, clearIdleTimer]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isOpen]);

  const isProminent = isOpen || isHovered || isFocusedWithin || !isDimmed;
  const opacityClass = isProminent ? 'opacity-100' : 'opacity-[0.35]';

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsDimmed(false);
  };

  return (
    <div
      ref={rootRef}
      className={`fixed z-[35] flex flex-col items-end gap-3 transition-opacity duration-300 ease-out ${opacityClass} right-4 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+1.25rem))] md:right-6 md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusedWithin(true)}
      onBlurCapture={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocusedWithin(false);
        }
      }}
      onTouchStart={() => setIsDimmed(false)}
    >
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="campaign-support-title"
          aria-describedby="campaign-support-desc"
          className="w-[min(100vw-2rem,18rem)] rounded-2xl border border-green-100 bg-[#fffef9] p-4 shadow-xl shadow-green-900/10"
        >
          <p id="campaign-support-title" className="text-sm font-bold text-gray-900 leading-snug">
            Sipariş vermekte sorun mu yaşıyorsunuz?
          </p>
          <p id="campaign-support-desc" className="mt-1.5 text-xs text-gray-600 leading-relaxed">
            Hemen bize ulaşın, yardımcı olalım.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a] focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              WhatsApp&apos;tan Yaz
            </a>
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-3 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            >
              <PhoneIcon className="h-5 w-5 shrink-0" />
              Hemen Ara
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Canlı destek ve sipariş yardımı"
        aria-expanded={isOpen}
        className="group flex items-center gap-2 rounded-full bg-green-700 py-2.5 pl-3 pr-3.5 text-white shadow-lg shadow-green-900/20 transition-transform duration-300 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 active:scale-[0.98] sm:pr-4"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <WhatsAppIcon className="h-5 w-5" />
        </span>
        <span className="hidden text-xs font-bold uppercase tracking-wide sm:inline">
          Sipariş Yardımı
        </span>
        <span className="text-xs font-bold sm:hidden">Yardım</span>
      </button>
    </div>
  );
}
