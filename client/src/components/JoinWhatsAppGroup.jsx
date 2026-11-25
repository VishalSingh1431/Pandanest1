import React from 'react';
import { Users, ArrowUpRight, MessageCircle } from 'lucide-react';
import { APP_CONFIG } from '../config';

export function JoinWhatsAppGroup({ title, subtitle, style }) {
  const groupUrl = APP_CONFIG.WHATSAPP_GROUP_LINK;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
        border: '1px solid #059669',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '650px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <MessageCircle size={28} color="#34d399" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                background: '#34d399',
                color: '#064e3b',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}
            >
              Official Channel
            </span>
            <span style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
              <Users size={13} style={{ display: 'inline', marginRight: '4px' }} />
              2,400+ Panda Club Followers
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.2px' }}>
            {title || 'Follow the Panda Club Channel on WhatsApp! 🐼'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#d1fae5', lineHeight: 1.4 }}>
            {subtitle || 'Get secret ₹50 toy drop coupons, early access to new kids games, and activity book giveaways directly on WhatsApp.'}
          </p>
        </div>
      </div>

      <a
        href={groupUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#25D366',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.92rem',
          padding: '12px 24px',
          borderRadius: '9999px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
          whiteSpace: 'nowrap',
          transition: 'transform 0.15s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span>Follow WhatsApp Channel</span>
        <ArrowUpRight size={18} />
      </a>
    </div>
  );
}

export default JoinWhatsAppGroup;
