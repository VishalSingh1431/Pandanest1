import React, { useState } from 'react';
import { ShoppingBag, Zap, Heart, Star, Sparkles, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { StarRating } from './StarRating';

export function ToyCard({ toy, onSelectToy }) {
  const { addToCart, buyNow } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Extract all available images (from images array or image_url)
  const rawImages = Array.isArray(toy?.images) && toy.images.length > 0
    ? toy.images.filter(Boolean)
    : [toy?.image_url].filter(Boolean);

  const activeImg = rawImages[currentImgIndex] || toy?.image_url || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';

  const discountPercent = toy.original_price && Number(toy.original_price) > Number(toy.price)
    ? Math.round(((Number(toy.original_price) - Number(toy.price)) / Number(toy.original_price)) * 100)
    : null;

  // Real review counts and ratings from database (zero hardcoding)
  const reviewCount = Number(toy.review_count || 0);
  const toyRating = toy.rating && Number(toy.rating) > 0 ? Number(toy.rating).toFixed(1) : null;

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? rawImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === rawImages.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(toy);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 900);
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    buyNow(toy);
  };

  return (
    <div
      className="card-hover-lift"
      style={{
        background: '#ffffff',
        borderRadius: '22px',
        border: '1.5px solid #eef2f6',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 20px 30px -8px rgba(16, 185, 129, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.06)';
        e.currentTarget.style.borderColor = '#6ee7b7';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)';
        e.currentTarget.style.borderColor = '#eef2f6';
      }}
    >
      {/* Top Image & Interactive Floating Badges */}
      <div
        className="toy-card-img-container"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          cursor: 'pointer'
        }}
        onClick={() => onSelectToy && onSelectToy(toy)}
      >
        <img
          src={activeImg}
          alt={toy.name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Previous & Next Arrow Buttons for multi-image toys */}
        {rawImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrevImage}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              transition: 'all 0.15s ease',
              color: '#0f172a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
        )}

        {rawImages.length > 1 && (
          <button
            type="button"
            onClick={handleNextImage}
            aria-label="Next image"
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              transition: 'all 0.15s ease',
              color: '#0f172a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Dot Indicators */}
        {rawImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              padding: '3px 7px',
              borderRadius: '9999px',
              zIndex: 3
            }}
          >
            {rawImages.map((_, idx) => (
              <span
                key={idx}
                style={{
                  width: idx === currentImgIndex ? '10px' : '4px',
                  height: '4px',
                  borderRadius: '9999px',
                  background: idx === currentImgIndex ? '#10b981' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
        )}

        {/* Soft bottom vignette overlay on image */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)',
            pointerEvents: 'none'
          }}
        />

        {/* Top-Left Badges */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 2 }}>
          {(toy.is_book || toy.category === 'Digital & Books' || String(toy.id).startsWith('game-book')) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                letterSpacing: '0.2px'
              }}
            >
              <Sparkles size={11} />
              PDF Digital Book
            </span>
          )}
          {toy.featured && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
                letterSpacing: '0.2px'
              }}
            >
              <Sparkles size={11} />
              Best Pick
            </span>
          )}
          {discountPercent && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)'
              }}
            >
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Top-Right Wishlist Floating Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          aria-label="Wishlist"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            zIndex: 2
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Heart
            size={16}
            color={isWishlisted ? '#ef4444' : '#64748b'}
            fill={isWishlisted ? '#ef4444' : 'none'}
          />
        </button>

        {/* Bottom-Right Age Badge */}
        <div style={{ position: 'absolute', bottom: '8px', right: '10px', zIndex: 2 }}>
          <span
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.2px'
            }}
          >
            {toy.age_group}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Category & Verified Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              color: '#059669',
              letterSpacing: '0.06em',
              background: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            {toy.category}
          </span>
          <span className="hide-on-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: '#0284c7', fontWeight: '700' }}>
            <ShieldCheck size={12} />
            Safe & Tested
          </span>
        </div>

        {/* Title */}
        <h3
          className="toy-card-title"
          style={{
            fontSize: '0.98rem',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: 1.3,
            margin: '4px 0 6px',
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.6em'
          }}
          onClick={() => onSelectToy && onSelectToy(toy)}
          title={toy.name}
        >
          {toy.name}
        </h3>

        {/* STAR RATING ROW */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: '4px 0 10px',
            cursor: 'pointer'
          }}
          onClick={() => onSelectToy && onSelectToy(toy)}
        >
          {reviewCount > 0 && toyRating ? (
            <>
              {/* Rating Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '2px 7px',
                  borderRadius: '7px'
                }}
              >
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#92400e' }}>
                  {toyRating}
                </span>
              </div>

              {/* Stars visual with precise full, half and empty fills */}
              <StarRating rating={Number(toyRating)} size={11} gap={1} />

              {/* Review Count */}
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
                ({reviewCount})
              </span>
            </>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
              <StarRating rating={0} size={11} gap={1} />
              <span style={{ fontWeight: '500' }}>No reviews yet</span>
            </div>
          )}
        </div>

        {/* Pricing & Stock Indicator */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '10px', flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', minWidth: 0 }}>
              <span style={{ fontSize: '1.08rem', fontWeight: '800', color: '#15803d', letterSpacing: '-0.3px' }}>
                ₹{Number(toy.price).toLocaleString('en-IN')}
              </span>
              {toy.original_price && Number(toy.original_price) > Number(toy.price) && (
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '500' }}>
                  ₹{Number(toy.original_price).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* In-Stock or Low-Stock Indicator */}
            {toy.stock !== undefined && (
              <span
                className="toy-card-stock-badge"
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  color: Number(toy.stock) <= 0 ? '#991b1b' : (Number(toy.stock) <= 5 ? '#e11d48' : '#059669'),
                  background: Number(toy.stock) <= 0 ? '#fee2e2' : (Number(toy.stock) <= 5 ? '#ffe4e6' : '#ecfdf5'),
                  padding: '2px 6px',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {Number(toy.stock) <= 0 ? 'Out of Stock' : (Number(toy.stock) <= 5 ? `Only ${toy.stock} left` : 'In Stock')}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {toy.stock !== undefined && Number(toy.stock) <= 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '7px' }}>
              <button
                type="button"
                disabled
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  border: '1px solid #e2e8f0',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Sold Out / Restocking Soon
              </button>
            </div>
          ) : (
            <div className="toy-card-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-press toy-card-btn"
                onClick={handleAddToCart}
                style={{
                  padding: '8px 6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                  background: addedAnim ? '#ecfdf5' : '#f8fafc',
                  borderColor: addedAnim ? '#10b981' : '#e2e8f0',
                  color: addedAnim ? '#059669' : '#0f172a',
                  transition: 'all 0.2s ease'
                }}
              >
                <ShoppingBag size={14} />
                <span>{addedAnim ? 'Added!' : 'Add'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm btn-press toy-card-btn"
                onClick={handleBuyNow}
                style={{
                  padding: '8px 6px',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.28)'
                }}
              >
                <Zap size={14} />
                <span>Buy Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
