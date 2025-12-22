'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Animation {
  id: string;
  startX: number;
  startY: number;
}

interface FlyToCartContextType {
  triggerAnimation: (startX: number, startY: number) => void;
  animations: Animation[];
  removeAnimation: (id: string) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [animations, setAnimations] = useState<Animation[]>([]);

  const triggerAnimation = (startX: number, startY: number) => {
    const id = `animation-${Date.now()}-${Math.random()}`;
    setAnimations((prev) => [...prev, { id, startX, startY }]);
  };

  const removeAnimation = (id: string) => {
    setAnimations((prev) => prev.filter((anim) => anim.id !== id));
  };

  return (
    <FlyToCartContext.Provider
      value={{
        triggerAnimation,
        animations,
        removeAnimation,
      }}
    >
      {children}
    </FlyToCartContext.Provider>
  );
}

export function useFlyToCart() {
  const context = useContext(FlyToCartContext);
  if (context === undefined) {
    throw new Error('useFlyToCart must be used within a FlyToCartProvider');
  }
  return context;
}

