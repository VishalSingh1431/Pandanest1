import React from 'react';
import { ShoppingBag, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function ToyCard({ toy, onSelectToy }) {
  const { addToCart, buyNow } = useCart();

  const discountPercent = toy.original_price && Number(toy.original_price) > Number(toy.price)
    ? Math.round(((Number(toy.original_price) - Number(toy.price)) / Number(toy.original_price)) * 100)
    : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1.5px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        transition: 'all 0.25s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.12)';
        e.currentTarget.style.borderColor = '#a7f3d0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {/* Top Media & Badges */}
      <div
        style={{
          position: 'relative',
          paddingTop: '80%',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          cursor: 'pointer'
        }}
        onClick={() => onSelectToy && onSelectToy(toy)}
      >
        <img
          src={toy.image_url}
          alt={toy.name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Badges Overlay */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {toy.featured && (
            <span className="badge badge-amber" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              ★ Popular Pick
            </span>
          )}
          {discountPercent && (
            <span className="badge badge-pink" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
          <span className="badge badge-blue" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: '#0369a1' }}>
            Age: {toy.age_group}
          </span>
        </div>
      </div>

      {/* Toy Info */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.05em', marginBottom: '3px' }}>
          {toy.category}
        </div>

        <h3
          style={{
            fontSize: '0.98rem',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: 1.25,
            marginBottom: '4px',
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
          onClick={() => onSelectToy && onSelectToy(toy)}
          title={toy.name}
        >
          {toy.name}
        </h3>

        <p
          className="hide-on-mobile"
          style={{
            fontSize: '0.82rem',
            color: '#64748b',
            lineHeight: 1.4,
            marginBottom: '10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {toy.description}
        </p>

        {/* Pricing and Stock */}
        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', fontFamily: 'var(--font-display)' }}>
              ₹{Number(toy.price).toLocaleString('en-IN')}
            </span>
            {toy.original_price && (
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                ₹{Number(toy.original_price).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => addToCart(toy)}
              style={{ padding: '7px 8px', fontSize: '0.78rem', justifyContent: 'center' }}
            >
              <ShoppingBag size={13} />
              <span>Add</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => buyNow(toy)}
              style={{ padding: '7px 8px', fontSize: '0.78rem', justifyContent: 'center' }}
            >
              <Zap size={13} />
              <span>Buy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
