import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, X, Award, User, Gamepad2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Navbar({ onOpenQR, currentRoute, navigate, searchQuery, setSearchQuery }) {
  const { cartCount, openCart } = useCart();
  const { isAuthenticated, admin, isAdmin } = useAuth();
  const [points, setPoints] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem('pandanest_panda_points');
    if (saved) {
      setPoints(parseInt(saved, 10));
    }
  }, [currentRoute]);

  return (
    <header
      className="navbar"
      style={{
        padding: '10px 0',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}
      >
        {/* 1. Logo */}
        <button
          className="nav-brand"
          onClick={() => navigate('catalog')}
          title="Panda Nest Home"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <img
            src="/logo.jpeg"
            alt="Panda Nest"
            style={{
              height: '52px',
              width: 'auto',
              borderRadius: '8px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </button>

        {/* 2. Search Product */}
        <div style={{ flex: '1', maxWidth: '480px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Search toys, brands, or categories..."
            value={searchQuery || ''}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentRoute !== 'catalog') navigate('catalog');
            }}
            style={{
              width: '100%',
              padding: '10px 40px 10px 44px',
              borderRadius: '9999px',
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right Section: Games & Activities | Cart | Panda Points | Login / Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* Games & Activities */}
          <button
            onClick={() => navigate('games')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: currentRoute === 'games' ? '#f59e0b' : '#fef3c7',
              border: '1.5px solid #fde68a',
              color: currentRoute === 'games' ? '#ffffff' : '#b45309',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: currentRoute === 'games' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)'
            }}
            title="Play Games & Watch Videos to Earn 10 PP"
          >
            <Gamepad2 size={17} />
            <span>Games & Activities</span>
          </button>

          {/* 3. Cart */}
          <button
            onClick={openCart}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            title="Shopping Cart"
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '1px 7px',
                  borderRadius: '9999px',
                  marginLeft: '2px'
                }}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* 4. Panda Points (Static Display Only - does not open anything) */}
          <div
            title="Panda Points Balance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#92400e',
              border: '1.5px solid #fcd34d',
              padding: '8px 15px',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'default',
              userSelect: 'none',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.1)'
            }}
          >
            <Award size={16} color="#d97706" />
            <span>{points} pts</span>
          </div>

          {/* 5. Login / Profile */}
          <button
            onClick={() => navigate(isAuthenticated ? (isAdmin ? 'admin-dashboard' : 'profile') : 'admin-login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: isAuthenticated ? '#ecfdf5' : '#ffffff',
              border: `1.5px solid ${isAuthenticated ? '#a7f3d0' : '#e2e8f0'}`,
              color: isAuthenticated ? '#047857' : '#0f172a',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              if (!isAuthenticated) e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isAuthenticated ? '#a7f3d0' : '#e2e8f0';
              if (!isAuthenticated) e.currentTarget.style.color = '#0f172a';
            }}
            title={isAuthenticated ? `Profile (${admin?.email || 'Admin'})` : 'Login / Profile'}
          >
            <User size={18} color={isAuthenticated ? '#059669' : '#64748b'} />
            <span>
              {isAuthenticated ? (admin?.name ? admin.name.split(' ')[0] : 'Profile') : 'Login'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
