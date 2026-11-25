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
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#ffffff"
        >
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zM12.05 20.2c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.09-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.12-.22-.18-.46-.3z" />
        </svg>
      </a>
    </aside>
  );
}

export default WhatsAppButton;
