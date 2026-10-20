import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    openCheckout
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeCart} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '10px' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a' }}>Your Toy Bag</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button className="modal-close" onClick={closeCart} style={{ position: 'static' }}>
            <X size={18} />
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '50px', marginBottom: '14px' }}>🧸</div>
              <h4 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '6px' }}>Your bag is empty</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Explore the catalog to find the next favorite toy!</p>
              <button className="btn btn-primary btn-sm" onClick={closeCart}>
                Browse Toys
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '12px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '10px' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ color: '#94a3b8', padding: '4px' }}
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px'
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{ padding: '4px 8px', color: '#475569' }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', padding: '0 6px', minWidth: '20px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{ padding: '4px 8px', color: '#475569' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto', fontWeight: '600' }}>
                        Subtotal: ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div
            style={{
              padding: '20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
              <span>Delivery Charges</span>
              <span style={{ color: '#10b981', fontWeight: '700' }}>FREE Delivery 🎉</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
              <span>Total Amount</span>
              <span style={{ color: '#047857' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px' }}
              onClick={() => {
                closeCart();
                openCheckout();
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
