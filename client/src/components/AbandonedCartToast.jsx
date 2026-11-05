import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function AbandonedCartToast() {
  const { cart, cartCount, openCheckout, isCheckoutOpen } = useCart();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if cart has items and checkout is not already open
    if (!cart || cart.length === 0 || isCheckoutOpen) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('pandanest_cart_toast_dismissed');
    if (isDismissed) return;

    // Show after gentle 3.2s delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 3200);

    return () => clearTimeout(showTimer);
  }, [cart, isCheckoutOpen]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pandanest_cart_toast_dismissed', 'true');
  };

  const handleResumeCheckout = () => {
    setIsVisible(false);
    sessionStorage.setItem('pandanest_cart_toast_dismissed', 'true');
    openCheckout();
  };

  if (!isVisible || !cart || cart.length === 0 || isCheckoutOpen) {
    return null;
  }

  const previewItems = cart.slice(0, 3);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '84px', // Above mobile bottom nav
        right: '20px',
        maxWidth: '420px',
        width: 'calc(100% - 40px)',
        zIndex: 90,
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1.5px solid #10b981',
          padding: '14px 16px',
          boxShadow: '0 16px 36px -6px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(16, 185, 129, 0.12)',
          position: 'relative'
        }}
      >
        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
          title="Dismiss reminder"
        >
          <X size={13} />
        </button>

        {/* Header & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '0.72rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sparkles size={11} />
            <span>Bag Saved 🐼</span>
          </div>

          <div
            style={{
              background: '#fef3c7',
              color: '#b45309',
              fontSize: '0.72rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Tag size={10} />
            <span>5% OFF CODE: PANDANEST</span>
          </div>
        </div>

        {/* Content Row: Thumbnails + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          {/* Thumbnails preview */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {previewItems.map((item, idx) => (
              <img
                key={idx}
                src={item.image_url}
                alt={item.name}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1.5px solid #e2e8f0'
                }}
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200'; }}
              />
            ))}
            {cart.length > 3 && (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#64748b'
                }}
              >
                +{cart.length - 3}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.25 }}>
              You have {cartCount} {cartCount === 1 ? 'toy' : 'toys'} in your bag!
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Toys are selling fast. Finish order before stock runs out.
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleResumeCheckout}
          className="btn-press"
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '0.88rem',
            borderRadius: '12px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}
        >
          <ShoppingBag size={16} />
          <span>Resume Checkout</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
export default AbandonedCartToast;
