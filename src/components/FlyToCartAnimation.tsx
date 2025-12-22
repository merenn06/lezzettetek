'use client';

import { useEffect, useState } from 'react';
import { useFlyToCart } from '@/contexts/FlyToCartContext';

const ANIMATION_DURATION = 600; // milliseconds

export default function FlyToCartAnimation() {
  const { animations, removeAnimation } = useFlyToCart();
  const [endPosition, setEndPosition] = useState<{ x: number; y: number } | null>(null);

  // Get cart icon position
  useEffect(() => {
    const updateEndPosition = () => {
      const cartButton = document.getElementById('cart-icon');
      if (cartButton) {
        const rect = cartButton.getBoundingClientRect();
        setEndPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    updateEndPosition();
    window.addEventListener('scroll', updateEndPosition);
    window.addEventListener('resize', updateEndPosition);

    return () => {
      window.removeEventListener('scroll', updateEndPosition);
      window.removeEventListener('resize', updateEndPosition);
    };
  }, []);

  if (!endPosition) return null;

  return (
    <>
      {animations.map((animation) => (
        <AnimationItem
          key={animation.id}
          id={animation.id}
          startX={animation.startX}
          startY={animation.startY}
          endX={endPosition.x}
          endY={endPosition.y}
          onComplete={() => removeAnimation(animation.id)}
        />
      ))}
    </>
  );
}

interface AnimationItemProps {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
}

function AnimationItem({
  startX,
  startY,
  endX,
  endY,
  onComplete,
}: AnimationItemProps) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  useEffect(() => {
    // Trigger animation completion
    const timer = setTimeout(() => {
      onComplete();
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Use requestAnimationFrame to ensure the initial state is rendered first
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Force a re-render to trigger the animation
    requestAnimationFrame(() => {
      setIsReady(true);
    });
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: `${startX}px`,
        top: `${startY}px`,
        transform: isReady
          ? `translate(${deltaX}px, ${deltaY}px) scale(0.3)`
          : 'translate(0, 0) scale(1)',
        opacity: isReady ? 0.3 : 1,
        transition: `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${ANIMATION_DURATION}ms ease-out`,
      }}
    >
      <div className="w-4 h-4 bg-green-600 rounded-full shadow-lg flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  );
}

