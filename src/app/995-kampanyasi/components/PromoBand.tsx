import type { ReactNode } from 'react';

type PromoBandProps = {
  children: ReactNode;
  bgClass: string;
  textClass?: string;
};

export default function PromoBand({
  children,
  bgClass,
  textClass = 'text-white',
}: PromoBandProps) {
  return (
    <section
      className={`${bgClass} px-4 py-10 sm:py-14 overflow-hidden`}
      aria-label="Kampanya mesajı"
    >
      <div className="container mx-auto max-w-5xl text-center">
        <p
          className={`text-3xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl ${textClass}`}
        >
          {children}
        </p>
      </div>
    </section>
  );
}
