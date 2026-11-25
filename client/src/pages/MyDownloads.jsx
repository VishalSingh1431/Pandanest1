import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function MyDownloads({ onGoToCatalog, onRequireLogin }) {
  const { isAuthenticated, token, user } = useAuth();
  const [digitalItems, setDigitalItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Digital download assets catalog with secure download links
  const SAMPLE_DIGITAL_FILES = [
    {
      id: 'drawing',
      title: 'Panda Nest 118-Page Jumbo Activity & Coloring Book',
      type: 'PDF Printable',
      pages: '118 High-Res Pages',
      fileSize: '4.2 MB',
      downloadUrl: '/drawing-book/page-001.jpg',
      isSample: true
    },
    {
      id: 'truthDare',
      title: 'Panda 100 Family Truth & Dare Party Cards Book',
      type: 'PDF Printable Cards',
      pages: '100 Cards',
      fileSize: '2.8 MB',
      downloadUrl: '/drawing-book/page-002.jpg',
      isSample: true
    },
    {
      id: 'balloon',
      title: 'Panda Pop & Learn Math & Colors Activity Book',
      type: 'PDF Educational Worksheets',
      pages: '52 Pages',
      fileSize: '3.1 MB',
      downloadUrl: '/drawing-book/page-003.jpg',
      isSample: true
    }
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchMyOrders = async () => {
      try {
        const res = await fetch('/api/orders/my-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const orders = await res.json();
          // Filter out orders that contain digital items / books and are paid or confirmed
          const downloads = [];
          for (const ord of orders) {
            const isOrderPaid = ord.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(ord.status);
            let items = [];
            try {
              items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []);
            } catch {
              items = [];
            }

            for (const it of items) {
              if (it.is_book || it.game_key || String(it.id).startsWith('game-book')) {
                downloads.push({
                  order_number: ord.order_number,
                  order_id: ord.id,
                  order_date: ord.created_at,
                  title: it.name || 'Panda Nest Activity Book',
                  isPaid: isOrderPaid,
                  downloadUrl: it.download_url || '/drawing-book/page-001.jpg',
                  gameKey: it.game_key || 'drawing'
                });
              }
            }
          }
          setDigitalItems(downloads);
        }
      } catch (e) {
        console.error('Fetch downloads error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px 20px', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <FileText size={32} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          My Digital Downloads &amp; PDF Books
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
          Please log in to your Panda Nest account to access and download your purchased coloring books &amp; game sheets.
        </p>
        <button
          onClick={onRequireLogin}
          className="btn btn-primary"
          style={{ padding: '12px 32px', borderRadius: '9999px', fontWeight: 800 }}
        >
          Login to View Downloads
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '36px 16px 80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={onGoToCatalog}
          style={{
            background: 'none',
            border: 'none',
            color: '#059669',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
          Back to Store
        </button>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ecfdf5',
            color: '#065f46',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 800,
            marginBottom: '8px',
            border: '1px solid #a7f3d0'
          }}
        >
          <Sparkles size={14} />
          <span>Instant Download Vault</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
          My Digital Library 📚
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
          Download high-resolution printables, coloring sheets, and kids activity books purchased under <strong>{user?.email}</strong>.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading your purchased digital books...
        </div>
      ) : digitalItems.length === 0 ? (
        <div>
          <div
            style={{
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              marginBottom: '36px'
            }}
          >
            <FileText size={42} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              No Purchased Digital Books Found Yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 18px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              Whenever you purchase a ₹9 PDF Activity Book or Printable Truth &amp; Dare Card Deck, it will appear here permanently for unlimited downloads.
            </p>
            <button
              onClick={onGoToCatalog}
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Explore Activity Books (₹9)
            </button>
          </div>

          {/* Complimentary Preview Samples */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
              🎁 Complimentary Welcome Printables for You:
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {SAMPLE_DIGITAL_FILES.map((sample) => (
                <div
                  key={sample.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    Free Bonus Sample
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '10px 0 6px' }}>
                    {sample.title}
                  </h4>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
                    {sample.pages} • {sample.fileSize}
                  </div>
                  <a
                    href={sample.downloadUrl}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#0f172a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '8px 16px',
                      borderRadius: '8px'
                    }}
                  >
                    <Download size={15} />
                    Download PDF Sample
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {digitalItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FileText size={24} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {item.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    Order: #{item.order_number} • Purchased on {new Date(item.order_date).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                {item.isPaid ? (
                  <a
                    href={item.downloadUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '10px 20px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <Download size={16} />
                    <span>Download PDF</span>
                  </a>
                ) : (
                  <span
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '9999px'
                    }}
                  >
                    Awaiting Payment Confirmation
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyDownloads;
