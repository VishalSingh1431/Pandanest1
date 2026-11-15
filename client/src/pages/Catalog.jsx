import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { parseResponse } from '../utils/api';
import { ToyCard } from '../components/ToyCard';
import { ProductDetailView } from '../components/ProductDetailView';
import {
  Sparkles,
  ArrowUpDown,
  X,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Truck,
  Award,
  Smile,
  Heart,
  Phone,
  Calendar,
  Gift,
  Star,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_CATEGORIES = [
  'All',
  'RC & Vehicles',
  'Plush & Soft Toys',
  'Dolls & Playsets',
  'Building Blocks & Sets',
  'Outdoor & Action',
  'Board Games & Fun',
  'Musical & Sensory Toys'
];

// Updated Age Ranges matching discussion (0-3, 3-5, 5-8, 8-12, 12+)
const AGE_GROUPS = [
  'All',
  '0-3 yrs',
  '3-5 yrs',
  '5-8 yrs',
  '8-12 yrs',
  '12+ yrs'
];

export function Catalog({ searchQuery, onOpenTruthOrDare, onOpenWelcome, onNavigate }) {
  const { isAuthenticated } = useAuth();
  const [toys, setToys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedToyModal, setSelectedToyModal] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [toyReviewsData, setToyReviewsData] = useState({ reviews: [], averageRating: 0, totalReviews: 0 });
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [hasInteractedExitWarning, setHasInteractedExitWarning] = useState(false);
  const [introVideo, setIntroVideo] = useState({ youtube_id: '39x-D2bO_s8' });

  useEffect(() => {
    fetch('/api/videos/intro')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.youtube_id) setIntroVideo(data);
      })
      .catch(() => {});
  }, []);

  // Hero embedded onboarding form state
  const [heroForm, setHeroForm] = useState({
    child_name: '',
    phone: '',
    dob: ''
  });
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroSubmitted, setHeroSubmitted] = useState(false);
  const [heroError, setHeroError] = useState('');
  const [heroResult, setHeroResult] = useState(null);
  const isFormCompleted = Boolean(
    isAuthenticated ||
    heroSubmitted ||
    localStorage.getItem('pandanest_member_child') ||
    localStorage.getItem('pandanest_lead_registered') ||
    parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10) > 0
  );

  const showVideo = isFormCompleted;

  // Exit-intent & page unload listener when points are claimed but user has not logged in
  useEffect(() => {
    // Only warn if user has un-synced points and is not logged in
    const checkUnsavedPoints = () => {
      const storedPoints = parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10);
      return !isAuthenticated && (heroSubmitted || storedPoints > 0);
    };

    const handleBeforeUnload = (e) => {
      if (checkUnsavedPoints()) {
        e.preventDefault();
        e.returnValue = 'You have 100 unsaved Panda Points! Log in now to keep them.';
        return e.returnValue;
      }
    };

    const handleMouseLeave = (e) => {
      // Trigger when mouse moves towards top of browser window (intent to close/change tab)
      if (e.clientY <= 10 && checkUnsavedPoints() && !hasInteractedExitWarning) {
        setShowExitWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isAuthenticated, heroSubmitted, hasInteractedExitWarning]);

  // Extract YouTube embed URL if provided
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : null;
  };

  useEffect(() => {
    if (!selectedToyModal) {
      setToyReviewsData({ reviews: [], averageRating: 0, totalReviews: 0 });
      setActiveImageIndex(0);
      return;
    }
    setActiveImageIndex(0);
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews/toy/${selectedToyModal.id}`);
        if (res.ok) {
          const data = await res.json();
          setToyReviewsData(data);
        }
      } catch (err) {
        console.warn('Failed to fetch reviews:', err);
      }
    };
    fetchReviews();
  }, [selectedToyModal]);

  const { addToCart, buyNow } = useCart();

  const fetchToys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedAge !== 'All') params.append('age', selectedAge);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy !== 'recommended') params.append('sort', sortBy);

      const res = await fetch(`/api/toys?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setToys(data);

        // Auto-open product if linked directly in URL
        const urlParams = new URLSearchParams(window.location.search);
        const prodId = urlParams.get('product') || urlParams.get('toy');
        if (prodId) {
          const match = data.find((t) => String(t.id) === String(prodId));
          if (match) setSelectedToyModal(match);
        }
      }
    } catch (err) {
      console.error('Error fetching toys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectToy = (toy) => {
    setSelectedToyModal(toy);
    window.history.pushState({}, '', `/?product=${toy.id}`);
  };

  const handleCloseToyModal = () => {
    setSelectedToyModal(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const prodId = urlParams.get('product') || urlParams.get('toy');
      if (prodId && toys.length > 0) {
        const match = toys.find((t) => String(t.id) === String(prodId));
        if (match) setSelectedToyModal(match);
      } else {
        setSelectedToyModal(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [toys]);

  useEffect(() => {
    fetchToys();
  }, [selectedCategory, selectedAge, searchQuery, sortBy]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const names = ['All', ...data.map(c => c.name)];
            setCategories(names);
          }
        }
      } catch (err) {
        console.warn('Could not fetch categories, using defaults:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    setHeroError('');

    if (!heroForm.child_name || !heroForm.phone || !heroForm.dob) {
      setHeroError('Please fill out Child Name, Mobile Number, and DOB.');
      return;
    }

    setHeroLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroForm)
      });

      const data = await parseResponse(res, 'Failed to submit details');

      setHeroResult(data);

      // Only grant 100 points on first registration; if already filled before, do NOT grant points again
      if (data.points_awarded > 0) {
        localStorage.setItem('pandanest_panda_points', '100');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
      } else {
        // Keep existing points if present
        if (!localStorage.getItem('pandanest_panda_points')) {
          localStorage.setItem('pandanest_panda_points', String(data.panda_points || 0));
        }
      }

      localStorage.setItem('pandanest_member_child', heroForm.child_name);
      localStorage.setItem('pandanest_member_phone', heroForm.phone);

      setHeroSubmitted(true);
    } catch (err) {
      setHeroError(err.message);
    } finally {
      setHeroLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Playful Hero Banner with Embedded Video Showcase - 100% Full Width Edge-to-Edge */}
      <section
        style={{
          width: '100%',
          position: 'relative',
          background: '#ffffff',
          overflow: 'hidden',
          lineHeight: 0,
          padding: 0
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2167 / 620',
            overflow: 'hidden'
          }}
          className="hero-banner-container"
        >
          <img
            src="/banner-spark-imaginations.png"
            alt="Panda Nest - Toys That Spark Wild Imaginations"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              left: showVideo ? '64.19%' : '63.4%',
              top: showVideo ? '11.61%' : '9.6%',
              width: showVideo ? '33.18%' : '34.6%',
              height: showVideo ? '70.32%' : '73.8%',
              borderRadius: showVideo ? '10px' : 'clamp(14px, 1.2vw, 24px)',
              overflow: 'hidden',
              background: showVideo ? '#000000' : '#ffffff',
              boxShadow: 'none',
              border: 'none',
              outline: 'none'
            }}
            className="hero-video-frame"
          >
            {showVideo ? (
              <iframe
                src={`https://www.youtube.com/embed/${introVideo?.youtube_id || '39x-D2bO_s8'}?autoplay=1&mute=1&loop=1&playlist=${introVideo?.youtube_id || '39x-D2bO_s8'}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
                title="Panda Nest Showcase Video"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  pointerEvents: 'none',
                  transform: 'scale(1.05)',
                  transformOrigin: 'center center'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <>
                {/* Desktop Form inside TV Screen - Expands seamlessly to eliminate any black border */}
                <div
                  className="hero-tv-desktop-form"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#ffffff',
                    padding: 'clamp(12px, 1.8vw, 22px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    lineHeight: 1.4,
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 'clamp(8px, 1.2vw, 14px)', lineHeight: 1.3 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ecfdf5',
                        color: '#047857',
                        padding: '5px 14px',
                        borderRadius: '9999px',
                        fontSize: 'clamp(0.85rem, 1.05vw, 1rem)',
                        fontWeight: 800,
                        marginBottom: '6px',
                        lineHeight: 1.2,
                        letterSpacing: '0.2px'
                      }}
                    >
                      🎁 100 WELCOME POINTS
                    </div>
                    <h3 style={{ fontSize: 'clamp(1.2rem, 1.6vw, 1.6rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.2 }}>
                      Join Panda Club &amp; Win Rewards 🐼
                    </h3>
                    <p style={{ fontSize: 'clamp(0.82rem, 1vw, 0.95rem)', color: '#475569', margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                      Register child's birthday for special surprise gifts!
                    </p>
                  </div>

                  {heroError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', marginBottom: '6px', textAlign: 'center', lineHeight: 1.3 }}>
                      {heroError}
                    </div>
                  )}

                  <form onSubmit={handleHeroSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.7vw, 7px)', lineHeight: 1.3 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: 'clamp(0.64rem, 0.72vw, 0.72rem)', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px', lineHeight: 1.2 }}>
                          <Heart size={11} color="#ec4899" /> Child Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aarav"
                          value={heroForm.child_name}
                          onChange={(e) => setHeroForm({ ...heroForm, child_name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: 'clamp(5px, 0.6vw, 7px) clamp(7px, 0.8vw, 10px)',
                            fontSize: 'clamp(0.72rem, 0.82vw, 0.84rem)',
                            borderRadius: '8px',
                            border: '1.5px solid #e2e8f0',
                            outline: 'none',
                            background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 'clamp(0.64rem, 0.72vw, 0.72rem)', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px', lineHeight: 1.2 }}>
                          <Phone size={11} color="#059669" /> WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit number"
                          value={heroForm.phone}
                          onChange={(e) => setHeroForm({ ...heroForm, phone: e.target.value })}
                          style={{
                            width: '100%',
                            padding: 'clamp(5px, 0.6vw, 7px) clamp(7px, 0.8vw, 10px)',
                            fontSize: 'clamp(0.72rem, 0.82vw, 0.84rem)',
                            borderRadius: '8px',
                            border: '1.5px solid #e2e8f0',
                            outline: 'none',
                            background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 'clamp(0.64rem, 0.72vw, 0.72rem)', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px', lineHeight: 1.2 }}>
                        <Calendar size={11} color="#8b5cf6" /> Child Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={heroForm.dob}
                        onChange={(e) => setHeroForm({ ...heroForm, dob: e.target.value })}
                        style={{
                          width: '100%',
                          padding: 'clamp(4px, 0.5vw, 6px) clamp(7px, 0.8vw, 10px)',
                          fontSize: 'clamp(0.72rem, 0.82vw, 0.84rem)',
                          borderRadius: '8px',
                          border: '1.5px solid #e2e8f0',
                          outline: 'none',
                          background: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={heroLoading}
                      style={{
                        width: '100%',
                        padding: 'clamp(7px, 0.8vw, 10px)',
                        fontSize: 'clamp(0.76rem, 0.86vw, 0.88rem)',
                        fontWeight: 800,
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                        marginTop: '2px'
                      }}
                    >
                      <Award size={15} />
                      <span>{heroLoading ? 'Unlocking Points...' : 'Unlock 100 Points & Rewards 🪙'}</span>
                    </button>
                  </form>
                </div>

                {/* Mobile inside TV: shows video preview */}
                <div className="hero-tv-mobile-video" style={{ width: '100%', height: '100%', display: 'none' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${introVideo?.youtube_id || '39x-D2bO_s8'}?autoplay=1&mute=1&loop=1&playlist=${introVideo?.youtube_id || '39x-D2bO_s8'}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
                    title="Panda Nest Showcase Video"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                      pointerEvents: 'none',
                      transform: 'scale(1.05)',
                      transformOrigin: 'center center'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Form Card: displayed only on mobile viewports when form is not yet submitted */}
      {!isFormCompleted && (
        <div className="hero-tv-mobile-form container" style={{ maxWidth: '480px', margin: '14px auto 0', padding: '0 12px', display: 'none' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ecfdf5',
                  color: '#047857',
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  marginBottom: '6px'
                }}
              >
                🎁 100 WELCOME POINTS
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.25 }}>
                Join Panda Club &amp; Win Rewards 🐼
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                Register child's birthday for special surprise gifts!
              </p>
            </div>

            {heroError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px', textAlign: 'center' }}>
                {heroError}
              </div>
            )}

            <form onSubmit={handleHeroSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Heart size={12} color="#ec4899" /> Child Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav"
                    value={heroForm.child_name}
                    onChange={(e) => setHeroForm({ ...heroForm, child_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Phone size={12} color="#059669" /> WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={heroForm.phone}
                    onChange={(e) => setHeroForm({ ...heroForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Calendar size={12} color="#8b5cf6" /> Child Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={heroForm.dob}
                  onChange={(e) => setHeroForm({ ...heroForm, dob: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={heroLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                  marginTop: '4px'
                }}
              >
                <Award size={16} />
                <span>{heroLoading ? 'Unlocking Points...' : 'Unlock 100 Points & Rewards 🪙'}</span>
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Main Catalog Body */}
      <main className="container" style={{ marginTop: '18px' }}>
        {/* Category Filter Pills */}
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none'
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                className="btn-press"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  border: selectedCategory === cat ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                  background: selectedCategory === cat ? '#10b981' : '#ffffff',
                  color: selectedCategory === cat ? '#ffffff' : '#475569',
                  boxShadow: selectedCategory === cat ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar: Age Group & Sorting */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '26px',
            padding: '14px 20px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)'
          }}
        >
          {/* Age Group Filter (0-3, 3-5, 5-8, 8-12, 12+) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.88rem',
                fontWeight: '800',
                color: '#92400e',
                background: '#fef3c7',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid #fde68a',
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)'
              }}
            >
              <span>🎂</span> Age Range:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {AGE_GROUPS.map((age) => {
                const isSelected = selectedAge === age;
                return (
                  <button
                    key={age}
                    className="btn-press"
                    onClick={() => setSelectedAge(age)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? '800' : '700',
                      border: isSelected ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
                      background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                        : '0 1px 3px rgba(0, 0, 0, 0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)'
                    }}
                  >
                    {age}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Dropdown & Product Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
              {toys.length} toy{toys.length !== 1 ? 's' : ''} found
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={14} color="#64748b" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#334155'
                }}
              >
                <option value="recommended">Featured / Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toys Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <img
              src="/logo.jpeg"
              alt="Loading toys"
              style={{ height: '56px', width: 'auto', marginBottom: '14px', borderRadius: '12px' }}
              className="animate-float"
            />
            <h3>Fetching the best toys from the nest...</h3>
          </div>
        ) : toys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '6px' }}>No toys found</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              Try clearing your search query or choosing another category.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedAge('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {toys.map((toy) => (
              <ToyCard key={toy.id} toy={toy} onSelectToy={handleSelectToy} />
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Page View (Matches Panda World PDP) */}
      {selectedToyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#ffffff', overflowY: 'auto' }}>
          <ProductDetailView
            toy={selectedToyModal}
            allToys={toys}
            onClose={handleCloseToyModal}
            onSelectToy={handleSelectToy}
          />
        </div>
      )}

      {/* Exit Warning Modal: Warns users about losing 100 points if they leave without logging in */}
      {showExitWarning && !isAuthenticated && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => {
            setShowExitWarning(false);
            setHasInteractedExitWarning(true);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #fed7aa',
              textAlign: 'center',
              position: 'relative',
              animation: 'modalFadeIn 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowExitWarning(false);
                setHasInteractedExitWarning(true);
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Warning Badge Icon */}
            <div
              style={{
                width: '68px',
                height: '68px',
                background: '#fff7ed',
                border: '2px solid #ffedd5',
                color: '#ea580c',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 20px rgba(234, 88, 12, 0.15)'
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <div className="badge badge-amber" style={{ marginBottom: '10px', fontSize: '0.8rem', padding: '4px 12px' }}>
              ⚠️ Unsaved Reward Points
            </div>

            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', marginBottom: '8px', lineHeight: 1.25 }}>
              Wait! Don't Lose Your 100 Panda Points! 🪙
            </h3>

            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '20px' }}>
              You have <strong>100 Panda Points</strong> waiting for you! If you leave without logging in, these points <strong>will be deleted</strong> and you won't be able to use them on your order.
            </p>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '20px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left'
              }}
            >
              <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '10px' }}>
                <Gift size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>
                  Takes just 10 seconds!
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Log in with 1-click Google or your mobile number to keep your 100 points safe.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => {
                  setShowExitWarning(false);
                  setHasInteractedExitWarning(true);
                  if (onNavigate) {
                    onNavigate('admin-login');
                  }
                }}
              >
                <Lock size={18} />
                <span>Log In Now to Save 100 Points</span>
              </button>

              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  padding: '8px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={() => {
                  setShowExitWarning(false);
                  setHasInteractedExitWarning(true);
                }}
              >
                I understand, continue browsing without saving points
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
