import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'wangs_wishlist_v1';

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const isWishlisted = useCallback(
    (productId) => items.some((p) => p?.id === productId),
    [items]
  );

  const toggleWishlist = useCallback((product) => {
    if (!product?.id) return false;
    let added = false;
    setItems((prev) => {
      const exists = prev.some((p) => p?.id === product.id);
      if (exists) {
        added = false;
        return prev.filter((p) => p?.id !== product.id);
      }
      added = true;
      return [product, ...prev];
    });
    return added;
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setItems((prev) => prev.filter((p) => p?.id !== productId));
  }, []);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        wishlistCount: items.length,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    return {
      items: [],
      wishlistCount: 0,
      isWishlisted: () => false,
      toggleWishlist: () => false,
      removeFromWishlist: () => {},
      clearWishlist: () => {},
    };
  }
  return ctx;
}
