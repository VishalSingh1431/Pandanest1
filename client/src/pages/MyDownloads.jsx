import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, ShoppingBag, Zap, BookOpen, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function MyDownloads({ onGoToCatalog, onRequireLogin }) {
  const { isAuthenticated, token, user } = useAuth();
  const { buyNow } = useCart();
  const [digitalItems, setDigitalItems] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Preview modal state
  const [previewBook, setPreviewBook] = useState(null);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [downloadingBookKey, setDownloadingBookKey] = useState(null);

  // Fetch all available store digital books
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
                  gameKey: it.game_key || (String(it.id).replace('game-book-', '')) || 'drawing'
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
      stock: 9999
    };
    buyNow(item);
  };

  // Securely request download URL from server
  const handleSecureDownload = async (gameKey, orderNumber) => {
    try {
      setDownloadingBookKey(gameKey);
      const url = new URL(`/api/game-books/secure-access/${gameKey}`, window.location.origin);
      if (orderNumber) url.searchParams.set('order_number', orderNumber);
      
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();

      if (data.hasAccess && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(data.message || 'Please purchase this book or login to download.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Unable to generate download link. Please refresh and try again.');
    } finally {
      setDownloadingBookKey(null);
    }
  };

  const openPreview = (book) => {
    let images = [];
    if (book.images) {
      try {
        images = typeof book.images === 'string' ? JSON.parse(book.images) : book.images;
      } catch {
        images = [];
      }
    }
    if (!images.length && book.image_url) {
      images = [book.image_url];
    }
    setPreviewBook({
      ...book,
      previewImages: images.length ? images : ['/drawing-book/page-001.jpg']
    });
    setActivePreviewIdx(0);
  };

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
          {isAuthenticated ? (
            <>Download high-resolution printables, coloring sheets, and kids activity books purchased under <strong>{user?.email}</strong>.</>
          ) : (
            <>Explore, preview, and download kids activity books, coloring packs &amp; printables instantly upon checkout.</>
          )}
        </p>
      </div>

      {/* GUEST BANNER (If not logged in, show friendly login prompt but keep catalog visible!) */}
      {!isAuthenticated && (
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={24} color="#059669" />
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                Already bought books on Panda Nest?
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Log in to instantly access and download your purchased digital PDF copies.
              </div>
            </div>
          </div>
          <button
            onClick={onRequireLogin}
            className="btn btn-primary"
            style={{ padding: '8px 20px', borderRadius: '9999px', fontWeight: 800, fontSize: '0.84rem' }}
          >
            Login to My Account
          </button>
        </div>
      )}

      {/* SECTION 1: PURCHASES (IF LOGGED IN AND HAS PAID ORDERS) */}
      {isAuthenticated && digitalItems.length > 0 && (
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
                    <button
                      type="button"
                      disabled={downloadingBookKey === item.gameKey}
                      onClick={() => handleSecureDownload(item.gameKey, item.order_number)}
                      style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 20px',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <Download size={15} />
                      <span>{downloadingBookKey === item.gameKey ? 'Opening...' : 'Download / Open PDF'}</span>
                    </button>
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

      {/* SECTION 2: COMPLETE DIGITAL ACTIVITY & COLORING BOOKS CATALOG (AVAILABLE TO PREVIEW & BUY) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
              📚 All Printable Books &amp; Activity Packs (Instant Access)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
              Click any book to preview sample pages. Instant PDF download access upon checkout!
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
            {availableBooks.length} Books Available
          </span>
        </div>

        <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {availableBooks.map((book) => {
            const alreadyPurchased = digitalItems.some(d => d.gameKey === book.game_key && d.isPaid);

            return (
              <div
                key={book.game_key}
                className="card-hover-lift"
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  border: '1.5px solid #eef2f6',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Book Thumbnail with Preview Button */}
                <div
                  className="toy-card-img-container"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => openPreview(book)}
                >
                  <img
                    src={book.image_url || '/drawing-book/page-001.jpg'}
                    alt={book.title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
                    {book.pages_count || '118 Pages'}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(255, 255, 255, 0.92)',
                      color: '#0f172a',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 9px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Eye size={12} color="#059669" /> Preview Pages
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

                {/* Card Content */}
                <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', gap: '6px', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: '#059669',
                        letterSpacing: '0.04em',
                        background: '#ecfdf5',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%'
                      }}
                    >
                      {book.category || 'PDF Book'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="toy-card-title"
                    onClick={() => openPreview(book)}
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      lineHeight: 1.3,
                      margin: '4px 0 8px',
                      cursor: 'pointer',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.6em'
                    }}
                    title={book.title}
                  >
                    {book.title}
                  </h3>

                  {/* Price & Action Row */}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '10px', flexWrap: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', minWidth: 0 }}>
                        <span style={{ fontSize: '1.08rem', fontWeight: '800', color: '#15803d', letterSpacing: '-0.3px' }}>
                          ₹{Number(book.price || 9).toLocaleString('en-IN')}
                        </span>
                        {book.original_price && Number(book.original_price) > Number(book.price || 9) && (
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '500' }}>
                            ₹{Number(book.original_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '2px 6px',
                          borderRadius: '5px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Instant PDF
                      </span>
                    </div>

                    {alreadyPurchased ? (
                      <button
                        type="button"
                        disabled={downloadingBookKey === book.game_key}
                        onClick={() => handleSecureDownload(book.game_key)}
                        style={{
                          width: '100%',
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Download size={14} /> Download PDF
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuyBook(book)}
                        className="btn btn-primary btn-sm btn-press"
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Zap size={14} /> Buy Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAMPLE PAGES PREVIEW LIGHTBOX MODAL */}
      {previewBook && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setPreviewBook(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px' }}>
                  Sample Preview ({activePreviewIdx + 1}/{previewBook.previewImages.length})
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {previewBook.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Image Carousel View */}
            <div style={{ position: 'relative', background: '#f8fafc', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <img
                src={previewBook.previewImages[activePreviewIdx]}
                alt="Book Sample Page"
                style={{ maxHeight: '440px', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              />

              {previewBook.previewImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePreviewIdx((prev) => (prev > 0 ? prev - 1 : previewBook.previewImages.length - 1))}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      background: 'rgba(255,255,255,0.85)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    <ChevronLeft size={22} color="#0f172a" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewIdx((prev) => (prev < previewBook.previewImages.length - 1 ? prev + 1 : 0))}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'rgba(255,255,255,0.85)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    <ChevronRight size={22} color="#0f172a" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail navigation dots */}
            {previewBook.previewImages.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', background: '#f8fafc' }}>
                {previewBook.previewImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePreviewIdx(i)}
                    style={{
                      width: '44px',
                      height: '44px',
                      padding: 0,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: activePreviewIdx === i ? '2.5px solid #10b981' : '1px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Footer with Purchase CTA */}
            <div style={{ padding: '20px 24px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d' }}>
                  ₹{previewBook.price || 9} <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>(Complete {previewBook.pages_count || '100+'} PDF)</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                  ⚡ Instant high-res printable download upon checkout
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewBook(null);
                  handleBuyBook(previewBook);
                }}
                className="btn-press"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Zap size={16} /> Buy Complete Book (₹{previewBook.price || 9})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyDownloads;
