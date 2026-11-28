import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('pandanest_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null); // Direct buy now single item or null for whole cart

  useEffect(() => {
    localStorage.setItem('pandanest_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (toy, quantity = 1) => {
    // Keep physical toy cart strictly separate from digital books
    if (toy?.is_book || toy?.is_digital || toy?.game_key || String(toy?.id || '').startsWith('game-book')) {
      buyNow(toy);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === toy.id);
      const maxStock = typeof toy.stock === 'number' && toy.stock >= 0 ? toy.stock : 99;
      if (maxStock <= 0) return prev; // Ignore out of stock toys
      const addQty = Math.max(1, parseInt(quantity || 1, 10));

      if (existing) {
        return prev.map(item =>
          item.id === toy.id
            ? { ...item, quantity: Math.min(item.quantity + addQty, maxStock), stock: maxStock }
            : item
        );
      }
      return [...prev, { ...toy, quantity: Math.min(addQty, maxStock), stock: maxStock }];
    });
  };

  const removeFromCart = (toyId) => {
    setCart(prev => prev.filter(item => item.id !== toyId));
  };

  const updateQuantity = (toyId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === toyId) {
            const maxStock = typeof item.stock === 'number' && item.stock >= 0 ? item.stock : 99;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (delta > 0 && item.quantity >= maxStock) return item; // capped at maxStock
            return { ...item, quantity: Math.min(newQty, maxStock) };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const buyNow = (toy) => {
    setCheckoutItem(toy);
    setIsCheckoutOpen(true);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        isCheckoutOpen,
        openCheckout: (item = null) => {
          setCheckoutItem(item);
          setIsCheckoutOpen(true);
        },
        closeCheckout: () => {
          setIsCheckoutOpen(false);
          setCheckoutItem(null);
        },
        checkoutItem,
        buyNow,
        openBuyNow: buyNow
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
