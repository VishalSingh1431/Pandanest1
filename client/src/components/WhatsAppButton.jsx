import React, { useState } from 'react';
import { APP_CONFIG } from '../config';

export function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);
  const chatUrl = APP_CONFIG.getWhatsAppChatUrl();

  return (
    <aside
      aria-label="WhatsApp Support and Inquiries"
      className="whatsapp-fab-container"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        zIndex: 998,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .whatsapp-fab-container {
            bottom: 74px !important;
            right: 12px !important;
          }
          .whatsapp-fab-btn {
            width: 48px !important;
            height: 48px !important;
          }
          .whatsapp-fab-btn svg {
            width: 26px !important;
            height: 26px !important;
          }
        }
      `}</style>
      {/* Tooltip on hover */}
      {hovered && (
        <span
          className="hide-on-mobile"
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          Chat with Panda Nest 🐼
        </span>
      )}

      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="whatsapp-fab-btn"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 6px 20px rgba(37, 211, 102, 0.45)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: hovered ? 'scale(1.08)' : 'scale(1)'
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </a>
    </aside>
  );
}

export default WhatsAppButton;
