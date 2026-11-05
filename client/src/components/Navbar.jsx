import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, X, Award, User, Gamepad2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Navbar({ onOpenQR, currentRoute, navigate, searchQuery, setSearchQuery }) {
  const { cartCount, openCart } = useCart();
  const { isAuthenticated, admin, isAdmin } = useAuth();
  const [points, setPoints] = useState(0);

  // Live Auto-Complete Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Debounced Auto-Complete Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/toys?search=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
          setShowDropdown(true);
        }
      } catch (e) {
        console.warn('Search auto-complete notice:', e);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click Outside to Dismiss Suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target))
      ) {
        setShowDropdown(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectSuggestion = (toy) => {
    setShowDropdown(false);
    if (currentRoute !== 'catalog') {
      navigate('catalog');
    }
    window.history.pushState({}, '', `/?product=${toy.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    const token = localStorage.getItem('pandanest_admin_token');
    if (token) {
      fetch('/api/users/my-points', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => setPoints(d?.panda_points ?? 0))
        .catch(() => setPoints(parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10)));
    } else {
      setPoints(parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10));
    }
  }, [currentRoute, isAuthenticated]);

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

        {/* 2. Search Product (Desktop / Tablet view) with Auto-Complete */}
        <div ref={searchContainerRef} className="hide-on-mobile" style={{ flex: '1', maxWidth: '480px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              zIndex: 1
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
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
              if (searchQuery && searchQuery.trim().length >= 2) setShowDropdown(true);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
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
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
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
                padding: 0,
                zIndex: 2
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}

          {/* Desktop Auto-Complete Suggestions Dropdown */}
          {showDropdown && searchQuery && searchQuery.trim().length >= 2 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 14px 34px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
                zIndex: 250,
                animation: 'fadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isSearching ? 'Searching...' : `Matching Toys (${suggestions.length})`}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Press Esc to close</span>
              </div>

              {suggestions.length > 0 ? (
                <div>
                  {suggestions.map((toy) => (
                    <div
                      key={toy.id}
                      onClick={() => handleSelectSuggestion(toy)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderBottom: '1px solid #f8fafc',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <img
                        src={toy.image_url}
                        alt={toy.name}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0
                        }}
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200'; }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {toy.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>{toy.category}</span>
                          <span>&bull;</span>
                          <span style={{ color: '#059669', fontWeight: '600' }}>{toy.age_group}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#15803d' }}>
                          Rs. {Number(toy.price).toLocaleString('en-IN')}
                        </div>
                        {toy.original_price && Number(toy.original_price) > Number(toy.price) && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            Rs. {Number(toy.original_price).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      if (currentRoute !== 'catalog') navigate('catalog');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#ecfdf5',
                      color: '#047857',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              ) : !isSearching ? (
                <div style={{ padding: '16px 14px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No toys found matching &ldquo;{searchQuery}&rdquo;. Try searching <em>plush</em>, <em>car</em>, or <em>puzzle</em>.
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Section: Games & Activities | Cart | Panda Points | Login / Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Games & Activities (Desktop Only) */}
          <button
            className="hide-on-mobile"
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
            <span>Games &amp; Activities</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={openCart}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              padding: '8px 14px',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Shopping Cart"
          >
            <ShoppingBag size={18} />
            <span className="hide-on-mobile">Cart</span>
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="animate-cart-bounce"
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

          {/* Panda Points Badge */}
          <div
            title="Panda Points Balance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#92400e',
              border: '1.5px solid #fcd34d',
              padding: '8px 12px',
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

          {/* Login / Profile (Desktop Only) */}
          <button
            className="hide-on-mobile"
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
            title={isAuthenticated ? `Profile (${admin?.email || 'Admin'})` : 'Login / Profile'}
          >
            <User size={18} color={isAuthenticated ? '#059669' : '#64748b'} />
            <span>
              {isAuthenticated ? (admin?.name ? admin.name.split(' ')[0] : 'Profile') : 'Login'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Row with Auto-Complete */}
      <div ref={mobileSearchRef} className="show-on-mobile container" style={{ marginTop: '8px', position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '26px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            pointerEvents: 'none',
            zIndex: 1
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
          onFocus={() => {
            if (searchQuery && searchQuery.trim().length >= 2) setShowDropdown(true);
          }}
          style={{
            width: '100%',
            padding: '9px 36px 9px 38px',
            borderRadius: '9999px',
            border: '1.5px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowDropdown(false);
            }}
            style={{
              position: 'absolute',
              right: '26px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              zIndex: 2
            }}
          >
            <X size={15} />
          </button>
        )}

        {/* Mobile Suggestions Dropdown */}
        {showDropdown && searchQuery && searchQuery.trim().length >= 2 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: '14px',
              right: '14px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
              overflow: 'hidden',
              zIndex: 250,
              animation: 'fadeInScale 0.18s ease'
            }}
          >
            {suggestions.length > 0 ? (
              <div>
                {suggestions.map((toy) => (
                  <div
                    key={toy.id}
                    onClick={() => handleSelectSuggestion(toy)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderBottom: '1px solid #f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={toy.image_url}
                      alt={toy.name}
                      style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {toy.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {toy.category} &bull; <strong style={{ color: '#059669' }}>{toy.age_group}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#15803d', flexShrink: 0 }}>
                      Rs. {Number(toy.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    if (currentRoute !== 'catalog') navigate('catalog');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    textAlign: 'center'
                  }}
                >
                  View all results for &ldquo;{searchQuery}&rdquo; &rarr;
                </button>
              </div>
            ) : !isSearching ? (
              <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No toys found.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
