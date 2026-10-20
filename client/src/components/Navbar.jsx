import React, { useState, useEffect } from 'react';
import { ShoppingBag, QrCode, Search, Shield, Sparkles, X, Award, Smile, Info, BookOpen } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Navbar({ onOpenQR, currentRoute, navigate, searchQuery, setSearchQuery }) {
  const { cartCount, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [points, setPoints] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem('pandanest_panda_points');
    if (saved) {
      setPoints(parseInt(saved, 10));
    }
  }, [currentRoute]);

  return (
    <header className="navbar">
      <div className="container nav-content">
        {/* Brand Logo */}
        <button
          className="nav-brand"
          onClick={() => navigate('catalog')}
          title="Panda Nest Home"
        >
          <div className="brand-icon">🐼</div>
          <div>
            <div className="brand-title">Panda Nest</div>
            <span className="brand-domain">pandanest.in</span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${currentRoute === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate('catalog')}
          >
            Toys
          </button>

          <button
            className={`btn btn-sm ${currentRoute === 'truth-or-dare' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate('truth-or-dare')}
            style={{ color: currentRoute === 'truth-or-dare' ? 'white' : '#b45309', background: currentRoute === 'truth-or-dare' ? '#f59e0b' : '#fef3c7', borderColor: '#fde68a' }}
          >
            <Smile size={15} />
            <span>Truth or Dare</span>
          </button>

          <button
            className={`btn btn-sm ${currentRoute === 'about' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate('about')}
          >
            <Info size={15} />
            <span>About Us</span>
          </button>

          <button
            className={`btn btn-sm ${currentRoute === 'policies' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate('policies')}
          >
            <BookOpen size={15} />
            <span>Policies</span>
          </button>
        </nav>

        {/* Search Bar (When in catalog) */}
        {currentRoute === 'catalog' && (
          <div className="nav-search" style={{ maxWidth: '300px' }}>
            <Search className="search-icon" size={17} />
            <input
              type="text"
              className="search-input"
              placeholder="Search toys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="nav-actions">
          {/* Panda Points Badge */}
          <div
            title="Your Panda Points Balance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1.5px solid #fde68a',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}
          >
            <Award size={15} color="#d97706" />
            <span>{points} pts</span>
          </div>

          {/* Quick link to test QR Form */}
          <button
            className={`btn btn-sm ${currentRoute === 'welcome' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate('welcome')}
            title="Open Customer QR Form"
          >
            <Sparkles size={15} />
            <span>QR Form</span>
          </button>

          {/* Show Printable Store QR Modal */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenQR}
            title="Generate & Print Store QR Standee"
          >
            <QrCode size={15} />
            <span>Store QR</span>
          </button>

          {/* Admin link */}
          <button
            className={`btn btn-sm ${currentRoute.startsWith('admin') ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => navigate(isAuthenticated ? 'admin-dashboard' : 'admin-login')}
            title="Admin Management"
          >
            <Shield size={15} />
            <span>{isAuthenticated ? 'Admin Panel' : 'Admin'}</span>
          </button>

          {/* Cart Trigger */}
          <button
            className="cart-btn"
            onClick={openCart}
            aria-label="Shopping Cart"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
