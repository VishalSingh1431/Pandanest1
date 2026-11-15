import React, { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

export function AnnouncementBar() {
  const [copied, setCopied] = useState(false);

  const handleCopyCoupon = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('PANDANEST');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const announcementItem = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', margin: '0 24px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        <Sparkles size={14} color="#fde047" />
        UNLOCK 5% OFF — APPLY COUPON
      </span>

      <button
        type="button"
        onClick={handleCopyCoupon}
        title="Click to copy coupon code"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#0f172a',
          fontWeight: '900',
          fontSize: '0.78rem',
          padding: '2px 9px',
          borderRadius: '9999px',
          border: '1.5px dashed #f59e0b',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          transition: 'all 0.15s ease'
        }}
      >
        <span>“PANDANEST”</span>
        {copied ? (
          <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem' }}>
            <Check size={12} strokeWidth={3} /> COPIED!
          </span>
        ) : (
          <Copy size={11} color="#64748b" />
        )}
      </button>

      <span style={{ fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        AT CHECKOUT 🐼
      </span>

      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>•</span>

      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fef08a' }}>
        FREE NATIONWIDE DELIVERY ABOVE ₹499 🚚
      </span>

      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>•</span>

      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>
        100% NON-TOXIC & CERTIFIED TOYS 🛡️
      </span>

      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>•</span>
    </div>
  );

  return (
    <aside
      aria-label="Promotional Announcement"
      style={{
        background: 'linear-gradient(90deg, #047857 0%, #059669 25%, #d97706 50%, #b45309 75%, #047857 100%)',
        color: '#ffffff',
        padding: '6px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        zIndex: 102
      }}
    >
      <div className="marquee-track">
        {announcementItem}
        {announcementItem}
        {announcementItem}
        {announcementItem}
      </div>
    </aside>
  );
}
