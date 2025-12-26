'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const partners = [
  { name: 'Carrefour', src: '/carrefour-new-seeklogo.webp' },
  { name: 'Çağrı Hipermarket', src: '/cagri-hipermarket-seeklogo.webp' },
  { name: 'Happy Center', src: '/happy-center-seeklogo.webp' },
  { name: 'Develi Restaurant', src: '/develi-restaurant-seeklogo.webp' },
  { name: 'Volkan Arpacı', src: '/volkanarpaci.webp' },
  { name: 'Kim Market', src: '/kim-market-seeklogo.webp' },
  { name: 'Onur', src: '/onur.webp' },
  { name: 'Özkuruşlar', src: '/ozkuruslar.webp' },
  { name: 'Showmar', src: '/showmar.webp' },
  { name: 'Biçen', src: '/bicen.webp' },
  { name: 'Titanic', src: '/titanic-logo_2020-08-12T20_08_57.656924.webp' },
  { name: 'Sarıyer Market', src: '/sariyermarket.webp' },
];

// Autoplay speed constant (pixels per frame)
const SPEED = 0.25;

export default function PartnersLogos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionTimeRef = useRef<number>(0);
  const scrollPositionRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    const section = sectionRef.current;
    if (!container || !inner) return;

    // Check for reduced motion preference
    let prefersReducedMotion = false;
    try {
      if (typeof window !== 'undefined') {
        prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    } catch (e) {
      // Fallback
    }

    if (prefersReducedMotion) {
      // Autoplay disabled, but manual scroll still works
      return;
    }

    // Get initial scroll width
    const getScrollWidth = () => {
      return inner.scrollWidth / 2; // Half because we duplicate the content
    };

    // Animation loop
    const animate = () => {
      if (!container || !inner) return;

      // Check if paused (user interaction or tab hidden)
      if (isPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check visibility
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check if section is visible
      if (!isVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate max scroll position
      const maxScroll = getScrollWidth();

      // Increment scroll position
      scrollPositionRef.current += SPEED;

      // Check if we've reached the end (with small buffer)
      if (scrollPositionRef.current >= maxScroll - 1) {
        // Reset to start (seamless loop)
        scrollPositionRef.current = 0;
      }

      // Use scrollTo for better mobile compatibility
      // Try scrollTo first, fallback to scrollLeft
      try {
        if (container.scrollTo) {
          container.scrollTo({
            left: scrollPositionRef.current,
            behavior: 'auto',
          });
        } else {
          container.scrollLeft = scrollPositionRef.current;
        }
      } catch (e) {
        // Fallback to scrollLeft if scrollTo fails
        container.scrollLeft = scrollPositionRef.current;
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Intersection Observer for visibility
    let observer: IntersectionObserver | null = null;
    if (section && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisibleRef.current = entry.isIntersecting;
          });
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
        }
      );
      observer.observe(section);
    } else {
      // Fallback: assume visible if IntersectionObserver is not available
      isVisibleRef.current = true;
    }

    // Start animation
    if (process.env.NODE_ENV === 'development') {
      console.log('autoplay started');
    }
    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle user interaction - PAUSE
    const handleUserInteraction = () => {
      isPausedRef.current = true;
      lastInteractionTimeRef.current = Date.now();

      // Sync scroll position when user interacts
      scrollPositionRef.current = container.scrollLeft;

      // Clear existing timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // Resume after 2000ms of no interaction
      idleTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 2000);
    };

    // Handle scroll event to sync position
    const handleScroll = () => {
      if (isPausedRef.current) {
        scrollPositionRef.current = container.scrollLeft;
      }
    };

    // Event listeners for user interaction
    container.addEventListener('mouseenter', handleUserInteraction);
    container.addEventListener('pointerdown', handleUserInteraction);
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (observer) {
        observer.disconnect();
      }
      container.removeEventListener('mouseenter', handleUserInteraction);
      container.removeEventListener('pointerdown', handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="w-full bg-gradient-to-b from-amber-50/50 to-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8 md:mb-12">
          Lezzetlerimizi Tercih Eden İş Ortaklarımız
        </h2>
        
        {/* Horizontal Scroll Container with Gradient Overlays */}
        <div className="relative">
          {/* Left Gradient Overlay */}
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
          
          {/* Scrollable Container - overflow-x-auto olan div */}
          <div 
            ref={containerRef}
            className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'auto',
              willChange: 'scroll-position',
            }}
          >
            {/* Flex row container with logo items */}
            <div ref={innerRef} className="flex gap-4 md:gap-6 px-4 md:px-8">
              {/* First list (for seamless loop) */}
              <div className="flex gap-4 md:gap-6 flex-shrink-0">
                {partners.map((partner, index) => (
                  <div
                    key={`first-${partner.src}-${index}`}
                    className="flex-shrink-0 min-w-[140px] md:min-w-[180px] h-16 md:h-20"
                  >
                    {/* Logo Chip Container */}
                    <div className="w-full h-full bg-white/70 rounded-xl px-5 py-3 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] hover:brightness-110">
                      <div className="relative w-full h-full">
                        <Image
                          src={partner.src}
                          alt={partner.name}
                          fill
                          className="object-contain opacity-100"
                          sizes="(max-width: 768px) 140px, 180px"
                          priority={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Duplicated list for seamless loop */}
              <div className="flex gap-4 md:gap-6 flex-shrink-0">
                {partners.map((partner, index) => (
                  <div
                    key={`second-${partner.src}-${index}`}
                    className="flex-shrink-0 min-w-[140px] md:min-w-[180px] h-16 md:h-20"
                  >
                    {/* Logo Chip Container */}
                    <div className="w-full h-full bg-white/70 rounded-xl px-5 py-3 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] hover:brightness-110">
                      <div className="relative w-full h-full">
                        <Image
                          src={partner.src}
                          alt={partner.name}
                          fill
                          className="object-contain opacity-100"
                          sizes="(max-width: 768px) 140px, 180px"
                          priority={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Gradient Overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
        </div>
      </div>
    </section>
  );
}
