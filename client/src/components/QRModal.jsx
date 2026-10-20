import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, ExternalLink, Sparkles } from 'lucide-react';

export function QRModal({ isOpen, onClose, onTestScan }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const printAreaRef = useRef(null);

  // Default link points to current origin + /welcome
  const targetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?page=welcome`
    : 'https://pandanest.in/welcome';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'pandanest-store-qr.png';
    a.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ marginBottom: '16px' }}>
          <div className="badge badge-green" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> Official In-Store QR Standee
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a' }}>Pandanest Store QR</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Place this QR at your toy shop billing counter or entrance. Customers scan to register their child's birthday and browse your toy catalog!
          </p>
        </div>

        {/* Printable Standee Card */}
        <div
          ref={printAreaRef}
          style={{
            background: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
            border: '2px dashed #10b981',
            borderRadius: '20px',
            padding: '24px 20px',
            margin: '20px 0',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)'
          }}
        >
          <img
            src="/logo.jpeg"
            alt="Panda Nest Logo"
            style={{
              height: '76px',
              width: 'auto',
              marginBottom: '10px',
              borderRadius: '12px',
              background: '#ffffff',
              padding: '4px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          />
          <h3 style={{ fontSize: '1.4rem', color: '#047857', marginBottom: '4px' }}>Welcome to Pandanest!</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Scan to explore all toys & register for birthday surprises!
          </p>

          <div
            style={{
              background: 'white',
              padding: '12px',
              borderRadius: '16px',
              display: 'inline-block',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Pandanest Customer QR Code"
                style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
              />
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Generating QR...
              </div>
            )}
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>
            pandanest.in
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose();
              if (onTestScan) onTestScan();
            }}
          >
            <ExternalLink size={18} />
            <span>Simulate Customer Scan (Open Welcome Form)</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownload}>
              <Download size={16} /> Download PNG
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handlePrint}>
              <Printer size={16} /> Print Standee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
