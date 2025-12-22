'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '@/types/product';

interface CartItem {
  product: Product;
  quantity: number;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  toggleMiniCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);

  const addItem = (product: Product) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevItems,
        {
          product,
          quantity: 1,
          imageUrl: (product as any).image_url ?? null,
        },
      ];
    });
    // Auto-open mini-cart when item is added
    setIsMiniCartOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const increaseQuantity = (productId: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (productId: string) => {
    setItems((prevItems) => {
      const item = prevItems.find((item) => item.product.id === productId);
      if (item && item.quantity > 1) {
        return prevItems.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        // Remove item if quantity is 1 or less
        return prevItems.filter((item) => item.product.id !== productId);
      }
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const itemPrice = item.product.price || 0;
      return total + itemPrice * item.quantity;
    }, 0);
  };

  const openMiniCart = () => {
    setIsMiniCartOpen(true);
  };

  const closeMiniCart = () => {
    setIsMiniCartOpen(false);
  };

  const toggleMiniCart = () => {
    setIsMiniCartOpen((prev) => !prev);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isMiniCartOpen,
        openMiniCart,
        closeMiniCart,
        toggleMiniCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
