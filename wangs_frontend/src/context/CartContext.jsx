import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const refreshCart = async () => {
    try {
      const data = await api.getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to load cart', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const data = await api.addToCart(productId, quantity);
      setCart(data);
      setIsDrawerOpen(true);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const data = await api.updateCartItem(productId, quantity);
      setCart(data);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const data = await api.removeFromCart(productId);
      setCart(data);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const clearCart = async () => {
    const data = await api.clearCart();
    setCart(data);
  };

  const itemsCount = cart?.financial_summary?.items_count || 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      itemsCount,
      isDrawerOpen,
      setIsDrawerOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
