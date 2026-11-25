import React, { useState, useEffect } from 'react';
import { BookOpen, Download, Lock, CheckCircle2, Eye, Sparkles, ShoppingBag, ArrowRight, ShieldCheck, FileText, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function DigitalBooksCatalog({ onNavigate }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookModal, setSelectedBookModal] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [unlockedKeys, setUnlockedKeys] = useState([]);
  const { addToCart, buyNow } = useCart();
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    fetch('/api/game-books')
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        const list = Array.isArray(data) ? data : Object.values(data || {});
        setBooks(list.filter(b => b.enabled !== false));
      })
      .catch(err => console.warn('Could not load digital books:', err))
      .finally(() => setLoading(false));
  }, []);

  // Check if current user has already bought any of these digital products
  useEffect(() => {
    const checkPurchases = async () => {
      const savedOrders = JSON.parse(localStorage.getItem('pandanest_order_history') || '[]');
      const localUnlocked = [];

      // Check local storage orders
      for (const ord of savedOrders) {
        if (ord.items && Array.isArray(ord.items)) {
          for (const it of ord.items) {
            if (it.game_key) localUnlocked.push(it.game_key);
            if (it.id && String(it.id).startsWith('game-book-')) {
              localUnlocked.push(String(it.id).replace('game-book-', ''));
            }
          }
        }
      }

      // Check server orders if logged in
      if (isAuthenticated && token) {
        try {
          const res = await fetch('/api/orders/my-orders', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const orders = await res.json();
            for (const ord of orders) {
              const isPaid = ord.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(ord.status);
              if (isPaid) {
                let items = [];
                try { items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []); } catch {}
                for (const it of items) {
                  if (it.game_key) localUnlocked.push(it.game_key);
                  if (it.id && String(it.id).startsWith('game-book-')) {
                    localUnlocked.push(String(it.id).replace('game-book-', ''));
                  }
                }
              }
            }
          }
        } catch {}
      }

      setUnlockedKeys([...new Set(localUnlocked)]);
    };

    checkPurchases();
  }, [isAuthenticated, token]);

  const categories = ['All', 'Coloring & Activity', 'Fun & Games', 'Learning & Math', 'Brain & Memory'];

  const filteredBooks = books.filter(b => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Coloring & Activity') return b.game_key === 'drawing' || (b.title && b.title.toLowerCase().includes('coloring'));
    if (selectedCategory === 'Fun & Games') return b.game_key === 'truthDare' || b.game_key === 'spin' || b.game_key === 'bamboo';
    if (selectedCategory === 'Learning & Math') return b.game_key === 'balloon' || b.game_key === 'trivia';
    if (selectedCategory === 'Brain & Memory') return b.game_key === 'memory';
    return true;
  });

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

  const handleAddToCart = (book) => {
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
    addToCart(item, 1);
  };

  return (
    <section style={{ margin: '40px 0 50px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)',
          borderRadius: '24px',
          padding: '32px 28px',
          color: '#ffffff',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 36px -10px rgba(15, 23, 42, 0.25)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 800,
                marginBottom: '10px'
              }}
            >
              <Sparkles size={14} /> Instant High-Res PDF Printables &bull; Buy Once, Print Forever!
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 10px', color: '#ffffff', letterSpacing: '-0.3px' }}>
              Panda Digital Activity Books &amp; Worksheets 📚
            </h2>
            <p style={{ margin: 0, fontSize: '0.96rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Jumbo 100+ page printable coloring sheets, family party games, memory boosters, and preschool learning books. 
              <strong> Instant PDF unlock upon checkout!</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onNavigate ? onNavigate('downloads') : (window.location.href = '?page=downloads')}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }}
            >
              <Download size={16} color="#059669" />
              <span>My Unlocked PDFs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '16px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: selectedCategory === cat ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
              background: selectedCategory === cat ? '#10b981' : '#ffffff',
              color: selectedCategory === cat ? '#ffffff' : '#475569',
              boxShadow: selectedCategory === cat ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Digital Books Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <h3>Loading digital books...</h3>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '22px'
          }}
        >
          {filteredBooks.map(book => {
            const isUnlocked = unlockedKeys.includes(book.game_key);
            const discountPercent = Math.round(((book.original_price - book.price) / (book.original_price || 99)) * 100);

            return (
              <div
                key={book.game_key}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: isUnlocked ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 14px 30px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.04)';
                }}
              >
                {/* Book Cover Image with PDF Overlay */}
                <div style={{ position: 'relative', width: '100%', height: '220px', background: '#f8fafc', overflow: 'hidden' }}>
                  <img
                    src={book.image_url || '/drawing-book/page-001.jpg'}
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.src = '/drawing-book/page-001.jpg'; }}
                  />

                  {/* Badge */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FileText size={12} color="#f59e0b" />
                      PDF E-Book
                    </span>
                    {discountPercent > 0 && !isUnlocked && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Lock/Unlocked Status */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    {isUnlocked ? (
                      <span
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(16,185,129,0.4)'
                        }}
                      >
                        <CheckCircle2 size={13} /> UNLOCKED
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#f8fafc',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Lock size={12} /> Buy to Unlock
                      </span>
                    )}
                  </div>

                  {/* Preview Button */}
                  <button
                    onClick={() => {
                      setActiveImageIndex(0);
                      setSelectedBookModal(book);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(4px)',
                      color: '#0f172a',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Eye size={13} /> Sample Preview
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {book.title}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.45, margin: '0 0 14px', flex: 1 }}>
                    {book.description || 'Full printable multi-page activity book with printable high-resolution pages.'}
                  </p>

                  {/* Pricing */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>
                        ₹{book.price || 9}
                      </span>
                      {book.original_price > book.price && (
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '6px' }}>
                          ₹{book.original_price}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      ⚡ Instant PDF
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {isUnlocked ? (
                    <a
                      href={book.pdf_url || '/drawing-book/sample-coloring-book.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Download size={15} />
                      <span>Download Full PDF 📥</span>
                    </a>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleBuyBook(book)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        <ShoppingBag size={14} />
                        <span>Buy ₹{book.price || 9}</span>
                      </button>
                      <button
                        onClick={() => handleAddToCart(book)}
                        title="Add PDF to Bag"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Bag
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sample Preview Modal (Protected / View Only Sample) */}
      {selectedBookModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedBookModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '580px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                  Sample Page Preview &bull; Watermarked
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  {selectedBookModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  color: '#64748b'
                }}
              >
                &times;
              </button>
            </div>

            {/* Multi-Image Gallery with Thumbnails (Front Cover, Back Cover, TOC, Sample Pages) */}
            {(() => {
              let modalImages = [];
              if (selectedBookModal.images) {
                try {
                  modalImages = Array.isArray(selectedBookModal.images) ? selectedBookModal.images : JSON.parse(selectedBookModal.images);
                } catch {}
              }
              if (modalImages.length === 0 && selectedBookModal.image_url) {
                modalImages = [selectedBookModal.image_url];
              }
              const currentImg = modalImages[activeImageIndex] || modalImages[0] || '/drawing-book/page-001.jpg';

              let currentTag = 'Sample Page';
              if (activeImageIndex === 0) currentTag = 'Front Cover';
              else if (activeImageIndex === 1) currentTag = 'Back Cover / Table of Contents';

              return (
                <div>
                  {/* Main Preview Container */}
                  <div style={{ position: 'relative', width: '100%', height: '340px', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                    <img
                      src={currentImg}
                      alt="Sample Page"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.src = '/drawing-book/page-001.jpg'; }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        color: '#34d399',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800
                      }}
                    >
                      {currentTag} ({activeImageIndex + 1}/{modalImages.length})
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        style={{
                          transform: 'rotate(-25deg)',
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: 'rgba(15, 23, 42, 0.16)',
                          letterSpacing: '2px',
                          border: '3px dashed rgba(15, 23, 42, 0.18)',
                          padding: '8px 24px',
                          borderRadius: '12px'
                        }}
                      >
                        SAMPLE PREVIEW &bull; PANDANEST.IN
                      </div>
                    </div>
                  </div>

                  {/* Thumbnails Row if multiple images */}
                  {modalImages.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px' }}>
                      {modalImages.map((img, idx) => {
                        let thumbLabel = `Page ${idx + 1}`;
                        if (idx === 0) thumbLabel = 'Front';
                        else if (idx === 1) thumbLabel = 'Back/TOC';

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                              position: 'relative',
                              width: '68px',
                              height: '68px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: activeImageIndex === idx ? '2.5px solid #10b981' : '1.5px solid #cbd5e1',
                              padding: 0,
                              background: '#fff',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: activeImageIndex === idx ? '#10b981' : 'rgba(15, 23, 42, 0.7)',
                                color: '#fff',
                                fontSize: '0.6rem',
                                padding: '1px 0',
                                fontWeight: 800,
                                textAlign: 'center'
                              }}
                            >
                              {thumbLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Locked Notice */}
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Lock size={20} color="#b45309" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#92400e', lineHeight: 1.4 }}>
                This is a sample preview. Buy for just <strong>₹{selectedBookModal.price || 9}</strong> to unlock the complete printable high-resolution PDF download with all {selectedBookModal.pages_count || '100+'} pages!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const b = selectedBookModal;
                  setSelectedBookModal(null);
                  handleBuyBook(b);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                }}
              >
                <ShoppingBag size={16} />
                <span>Unlock &amp; Download Full PDF for ₹{selectedBookModal.price || 9}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DigitalBooksCatalog;
