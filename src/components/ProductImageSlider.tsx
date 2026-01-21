'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

type ProductImageSliderProps = {
  images: Array<string | null | undefined>;
  alt: string;
  sizes?: string;
  className?: string;
  imageClassName?: string;
};

export default function ProductImageSlider({
  images,
  alt,
  sizes,
  className,
  imageClassName,
}: ProductImageSliderProps) {
  const normalizedImages = Array.isArray(images) ? images : [];
  const validImages = useMemo(
    () => normalizedImages.filter((img): img is string => !!img && img.trim().length > 0),
    [normalizedImages]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  if (validImages.length <= 1) {
    const src = validImages[0];
    if (!src) return null;
    return (
      <div className={`relative w-full h-full ${className ?? ''}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={imageClassName ?? 'object-cover'}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <Image
        key={validImages[activeIndex]}
        src={validImages[activeIndex]}
        alt={alt}
        fill
        sizes={sizes}
        className={imageClassName ?? 'object-cover'}
        loading="lazy"
      />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 shadow-sm">
        {validImages.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveIndex(index);
            }}
            className={`h-2 w-2 rounded-full transition-colors ${
              index === activeIndex ? 'bg-green-700' : 'bg-gray-300'
            }`}
            aria-label={`Görsel ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
