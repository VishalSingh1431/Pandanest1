import React from 'react';
import { ShoppingBag, Gamepad2, Home, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function MobileBottomNav({ currentRoute, navigate }) {
  const { cartCount, openCart } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div
      className="show-on-mobile"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '62px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        zIndex: 999,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <button
        onClick={() => navigate('catalog')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          color: currentRoute === 'catalog' ? '#059669' : '#64748b',
          fontWeight: currentRoute === 'catalog' ? '800' : '600',
          fontSize: '0.72rem',
          cursor: 'pointer',
          padding: '4px 0'
        }}
      >
        <Home size={20} color={currentRoute === 'catalog' ? '#059669' : '#64748b'} />
        <span>Shop</span>
      </button>

      <button
        onClick={() => navigate('games')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          color: currentRoute === 'games' ? '#d97706' : '#64748b',
          fontWeight: currentRoute === 'games' ? '800' : '600',
          fontSize: '0.72rem',
          cursor: 'pointer',
          padding: '4px 0'
        }}
      >
        <Gamepad2 size={20} color={currentRoute === 'games' ? '#d97706' : '#64748b'} />
        <span>Play &amp; Earn</span>
      </button>

      <button
        onClick={openCart}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          color: '#0f172a',
          fontWeight: '600',
          fontSize: '0.72rem',
          cursor: 'pointer',
          position: 'relative',
          padding: '4px 0'
        }}
      >
        <div style={{ position: 'relative' }}>
          <ShoppingBag size={20} color="#0f172a" />
          {cartCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: '800',
                borderRadius: '9999px',
                padding: '1px 5px',
                minWidth: '16px',
                textAlign: 'center'
              }}
            >
              {cartCount}
            </span>
          )}
        </div>
        <span>Cart</span>
      </button>

      <button
        onClick={() => navigate(isAuthenticated ? (isAdmin ? 'admin-dashboard' : 'profile') : 'admin-login')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          color: (currentRoute === 'profile' || currentRoute === 'admin-dashboard' || currentRoute === 'admin-login') ? '#059669' : '#64748b',
          fontWeight: (currentRoute === 'profile' || currentRoute === 'admin-dashboard' || currentRoute === 'admin-login') ? '800' : '600',
          fontSize: '0.72rem',
          cursor: 'pointer',
          padding: '4px 0'
        }}
      >
        <User size={20} color={(currentRoute === 'profile' || currentRoute === 'admin-dashboard' || currentRoute === 'admin-login') ? '#059669' : '#64748b'} />
        <span>{isAuthenticated ? 'Account' : 'Login'}</span>
      </button>
    </div>
  );
}
export default MobileBottomNav;
