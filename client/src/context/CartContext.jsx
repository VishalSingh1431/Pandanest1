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
    setCart(prev => {
      const existing = prev.find(item => item.id === toy.id);
      if (existing) {
        return prev.map(item =>
          item.id === toy.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...toy, quantity }];
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
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
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
        buyNow
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
