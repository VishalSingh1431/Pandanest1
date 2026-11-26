import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, ShoppingBag, Zap, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function MyDownloads({ onGoToCatalog, onRequireLogin }) {
  const { isAuthenticated, token, user } = useAuth();
  const { buyNow } = useCart();
  const [digitalItems, setDigitalItems] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all available store digital books so customers can see and buy them right from this page
  useEffect(() => {
    fetch('/api/game-books')
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        const list = Array.isArray(data) ? data : Object.values(data || {});
        setAvailableBooks(list.filter(b => b.enabled !== false));
      })
      .catch(err => console.warn('Could not load game books:', err));
  }, []);

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
                  downloadUrl: it.download_url || it.pdf_url || '/drawing-book/sample-coloring-book.pdf',
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

  const handleBuyBook = (book) => {
    const item = {
      id: `game-book-${book.game_key}`,
      game_key: book.game_key,
      name: book.title,
      price: book.price || 9,
      original_price: book.original_price || 99,
      image_url: book.image_url || '/drawing-book/page-001.jpg',
      category: 'Digital Books',
      is_book: true,
      pdf_url: book.pdf_url || '/drawing-book/sample-coloring-book.pdf',
      stock: 9999
    };
    buyNow(item);
  };

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
          My Digital Library 📚
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
          Please log in to your Panda Nest account to access your digital books library.
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
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '36px 16px 80px' }}>
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
          <span>Panda Nest Digital Books Vault</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
          My Digital Library 📚
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
          Download high-resolution printables, coloring sheets, and kids activity books purchased under <strong>{user?.email}</strong>.
        </p>
      </div>

      {/* SECTION 1: PURCHASES (IF ANY) */}
      {digitalItems.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="#10b981" />
            <span>Your Purchased Downloadable Books:</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {digitalItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileText size={22} color="#059669" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
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
                        padding: '9px 20px',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </a>
                  ) : (
                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '9999px'
                      }}
                    >
                      Awaiting Payment
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: COMPLETE DIGITAL ACTIVITY & COLORING BOOKS CATALOG (AVAILABLE TO BUY & DOWNLOAD) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
              📚 All Printable Books &amp; Activity Packs (Instant Access)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
              Get instant printable coloring pages, games, and brain teasers for just ₹9 each!
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
            {availableBooks.length} Books Available
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {availableBooks.map((book) => {
            const alreadyPurchased = digitalItems.some(d => d.gameKey === book.game_key && d.isPaid);

            return (
              <div
                key={book.game_key}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Book Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '180px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f1f5f9',
                    marginBottom: '14px'
                  }}
                >
                  <img
                    src={book.image_url || '/drawing-book/page-001.jpg'}
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.src = '/drawing-book/page-001.jpg'; }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    PDF Download
                  </div>
                  {alreadyPurchased && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <CheckCircle2 size={11} /> Unlocked
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.35, minHeight: '2.7em' }}>
                  {book.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 14px', lineHeight: 1.4, flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {book.description}
                </p>

                {/* Price & Action Row */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803d' }}>
                      Rs. {book.price || 9}.00
                    </div>
                    {book.original_price && (
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        Rs. {book.original_price}.00
                      </div>
                    )}
                  </div>

                  {alreadyPurchased ? (
                    <a
                      href={book.pdf_url || '/drawing-book/sample-coloring-book.pdf'}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} /> Download
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuyBook(book)}
                      className="btn-press"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Zap size={14} /> Buy Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MyDownloads;
