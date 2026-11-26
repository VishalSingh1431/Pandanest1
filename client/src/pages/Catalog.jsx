import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { parseResponse } from '../utils/api';
import { ToyCard } from '../components/ToyCard';
import { ProductDetailView } from '../components/ProductDetailView';
import { DigitalBooksCatalog } from '../components/DigitalBooksCatalog';
import { JoinWhatsAppGroup } from '../components/JoinWhatsAppGroup';
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
  AlertTriangle,
  Volume2,
  VolumeX
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

// Distinct Age Group Filter Configurations with pastel colors & emojis
const AGE_GROUPS_CONFIG = [
  { label: 'All', emoji: '🌟', bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', activeBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', badgeBg: '#d1fae5', badgeColor: '#065f46' },
  { label: '0-3 yrs', emoji: '🍼', bg: '#fff1f2', border: '#fecdd3', color: '#9f1239', activeBg: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', badgeBg: '#ffe4e6', badgeColor: '#9f1239' },
  { label: '3-5 yrs', emoji: '🧸', bg: '#fefce8', border: '#fde68a', color: '#854d0e', activeBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', badgeBg: '#fef3c7', badgeColor: '#854d0e' },
  { label: '5-8 yrs', emoji: '🚀', bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1', activeBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', badgeBg: '#e0f2fe', badgeColor: '#0369a1' },
  { label: '8-12 yrs', emoji: '🏎️', bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8', activeBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', badgeBg: '#f3e8ff', badgeColor: '#6b21a8' },
  { label: '12+ yrs', emoji: '⚡', bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', activeBg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', badgeBg: '#ffedd5', badgeColor: '#c2410c' }
];

const AGE_GROUPS = AGE_GROUPS_CONFIG.map(g => g.label);

export function Catalog({ searchQuery, onOpenTruthOrDare, onOpenWelcome, onNavigate }) {
  const { isAuthenticated } = useAuth();
  const [toys, setToys] = useState([]);
  const [allToys, setAllToys] = useState([]);
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
  const [isHeroVideoMuted, setIsHeroVideoMuted] = useState(true);

  // Today's Sale live countdown timer till midnight
  const [saleCountdown, setSaleCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end - now);
      setSaleCountdown({
        hours: String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0'),
        minutes: String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'),
        seconds: String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0')
      });
    };
    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all toys once for age count badges
  useEffect(() => {
    fetch('/api/toys')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setAllToys(data);
      })
      .catch(() => {});
  }, []);

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
      let fetchedToys = [];
      if (res.ok) {
        fetchedToys = await res.json();
      }

      // Fetch digital activity books to seamlessly display in main catalog
      let digitalBooks = [];
      try {
        const booksRes = await fetch('/api/game-books');
        if (booksRes.ok) {
          const rawBooks = await booksRes.json();
          const list = Array.isArray(rawBooks) ? rawBooks : Object.values(rawBooks || {});
          digitalBooks = list
            .filter(b => b.enabled !== false)
            .map(b => ({
              id: `game-book-${b.game_key}`,
              game_key: b.game_key,
              name: b.title,
              category: 'Digital & Books',
              price: b.price || 9,
              original_price: b.original_price || 99,
              age_group: b.age_group || '3-8 yrs',
              description: b.description || 'Instant downloadable PDF activity and story book for kids.',
              image_url: b.image_url || '/drawing-book/page-001.jpg',
              images: b.images ? (typeof b.images === 'string' ? JSON.parse(b.images) : b.images) : [b.image_url || '/drawing-book/page-001.jpg'],
              stock: 9999,
              featured: true,
              is_book: true,
              is_digital: true,
              pdf_url: b.pdf_url || '/drawing-book/sample-coloring-book.pdf',
              rating: 5.0,
              review_count: 14
            }));
        }
      } catch (bookErr) {
        console.warn('Could not load game books for catalog:', bookErr);
      }

      // Filter digital books according to active filters
      const matchingDigitalBooks = digitalBooks.filter(b => {
        if (selectedCategory !== 'All' && selectedCategory !== 'Digital & Books') return false;
        if (selectedAge !== 'All' && b.age_group !== selectedAge) return false;
        if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });

      // Merge toys and digital books
      let combined = [];
      if (selectedCategory === 'Digital & Books') {
        combined = matchingDigitalBooks;
      } else {
        combined = [...matchingDigitalBooks, ...fetchedToys];
      }

      setToys(combined);

      // Auto-open product if linked directly in URL
      const urlParams = new URLSearchParams(window.location.search);
      const prodId = urlParams.get('product') || urlParams.get('toy');
      if (prodId) {
        const match = combined.find((t) => String(t.id) === String(prodId));
        if (match) {
          setSelectedToyModal(match);
        } else {
          // Direct fetch fallback if current filter excluded this toy
          fetch(`/api/toys/${prodId}`)
            .then(r => r.ok ? r.json() : null)
            .then(directToy => { if (directToy) setSelectedToyModal(directToy); })
            .catch(() => {});
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
      if (prodId) {
        const match = toys.find((t) => String(t.id) === String(prodId)) || allToys.find((t) => String(t.id) === String(prodId));
        if (match) {
          setSelectedToyModal(match);
        } else {
          fetch(`/api/toys/${prodId}`)
            .then(r => r.ok ? r.json() : null)
            .then(directToy => { if (directToy) setSelectedToyModal(directToy); })
            .catch(() => {});
        }
      } else {
        setSelectedToyModal(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [toys, allToys]);

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
            const fetchedNames = data.map(c => c.name);
            const merged = ['All', 'Digital & Books', ...fetchedNames.filter(n => n !== 'Digital & Books')];
            setCategories(merged);
          } else {
            setCategories(['All', 'Digital & Books', ...DEFAULT_CATEGORIES]);
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
              <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                <iframe
                  key={isHeroVideoMuted ? 'muted' : 'unmuted'}
                  src={`https://www.youtube-nocookie.com/embed/${introVideo?.youtube_id || '39x-D2bO_s8'}?autoplay=1&mute=${isHeroVideoMuted ? '1&volume=0' : '0'}&loop=1&playlist=${introVideo?.youtube_id || '39x-D2bO_s8'}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
                  title="Panda Nest Showcase Video"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    pointerEvents: 'none',
                    transform: 'scale(1.35)',
                    transformOrigin: 'center center'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />

                {/* Floating Sound Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsHeroVideoMuted(prev => !prev)}
                  title={isHeroVideoMuted ? "Click to Unmute / Turn Sound ON 🔊" : "Mute Sound 🔇"}
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    zIndex: 10,
                    background: isHeroVideoMuted ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isHeroVideoMuted ? (
                    <>
                      <VolumeX size={14} color="#fca5a5" />
                      <span>Unmute 🔊</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} color="#ffffff" />
                      <span>Sound ON 🎵</span>
                    </>
                  )}
                </button>
              </div>
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
                <div className="hero-tv-mobile-video" style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'none', position: 'relative' }}>
                  <iframe
                    key={isHeroVideoMuted ? 'mobile-muted' : 'mobile-unmuted'}
                    src={`https://www.youtube-nocookie.com/embed/${introVideo?.youtube_id || '39x-D2bO_s8'}?autoplay=1&mute=${isHeroVideoMuted ? '1&volume=0' : '0'}&loop=1&playlist=${introVideo?.youtube_id || '39x-D2bO_s8'}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
                    title="Panda Nest Showcase Video"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                      pointerEvents: 'none',
                      transform: 'scale(1.35)',
                      transformOrigin: 'center center'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <button
                    type="button"
                    onClick={() => setIsHeroVideoMuted(prev => !prev)}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      zIndex: 10,
                      background: isHeroVideoMuted ? 'rgba(15, 23, 42, 0.85)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: '1.5px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '9999px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isHeroVideoMuted ? <VolumeX size={12} color="#fca5a5" /> : <Volume2 size={12} color="#ffffff" />}
                    <span>{isHeroVideoMuted ? 'Unmute' : 'Sound ON'}</span>
                  </button>
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
        {/* TODAY'S SPECIAL SALE - FLASH DEALS (Prominent Top Banner & Limited Time Countdown) */}
        {(() => {
          const explicitSaleToys = (allToys.length > 0 ? allToys : toys).filter(t => t.is_todays_sale);
          const todaysSaleToys = explicitSaleToys.length > 0
            ? explicitSaleToys
            : (allToys.length > 0 ? allToys : toys).slice(0, 4);

          if (todaysSaleToys.length === 0) return null;

          return (
            <div
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #fff1f2 40%, #fefce8 100%)',
                border: '2.5px solid #f43f5e',
                borderRadius: '24px',
                padding: '24px 20px',
                marginBottom: '28px',
                boxShadow: '0 16px 36px -10px rgba(244, 63, 94, 0.22), 0 4px 12px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Header with Title & Live Countdown Timer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '20px',
                  borderBottom: '1.5px dashed #fecdd3',
                  paddingBottom: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e11d48', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <Zap size={14} fill="#ffffff" /> TODAY'S SPECIAL SALE
                  </div>
                  <h2 style={{ fontSize: 'clamp(1.25rem, 2vw, 1.7rem)', fontWeight: '900', color: '#881337', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Limited Time Flash Deals</span>
                    <span>🔥</span>
                  </h2>
                  <p style={{ color: '#9f1239', fontSize: '0.88rem', margin: '4px 0 0', fontWeight: '600' }}>
                    Curated daily discounts by Panda Nest! Grab yours before time runs out.
                  </p>
                </div>

                {/* Digital Countdown Timer */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #fda4af',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⏳ Deals Expire In
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ background: '#881337', color: '#ffffff', padding: '3px 7px', borderRadius: '6px', fontWeight: '900', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                        {saleCountdown.hours}h
                      </span>
                      <span style={{ fontWeight: '900', color: '#e11d48' }}>:</span>
                      <span style={{ background: '#881337', color: '#ffffff', padding: '3px 7px', borderRadius: '6px', fontWeight: '900', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                        {saleCountdown.minutes}m
                      </span>
                      <span style={{ fontWeight: '900', color: '#e11d48' }}>:</span>
                      <span style={{ background: '#e11d48', color: '#ffffff', padding: '3px 7px', borderRadius: '6px', fontWeight: '900', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                        {saleCountdown.seconds}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deals Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '16px'
                }}
              >
                {todaysSaleToys.map((toy) => {
                  const salePrice = toy.todays_sale_price || toy.price;
                  const origPrice = toy.original_price || Math.round(toy.price * 1.35);
                  const discountPct = Math.max(15, Math.round(((origPrice - salePrice) / origPrice) * 100));

                  return (
                    <div
                      key={toy.id}
                      onClick={() => handleSelectToy(toy)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        border: '1.5px solid #fecdd3',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: '0 4px 14px rgba(244, 63, 94, 0.08)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(244, 63, 94, 0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(244, 63, 94, 0.08)';
                      }}
                    >
                      {/* Top Flash Tag */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'linear-gradient(135deg, #e11d48, #be123c)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: '900',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          zIndex: 2,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                        }}
                      >
                        🔥 {discountPct}% OFF
                      </div>

                      {/* Product Image */}
                      <div style={{ width: '100%', height: '145px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={toy.image_url || '/placeholder.jpg'}
                          alt={toy.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s ease' }}
                        />
                      </div>

                      {/* Title & Age */}
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#be123c', textTransform: 'uppercase' }}>
                        {toy.age_group || 'All Ages'}
                      </span>
                      <h4
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: '800',
                          color: '#0f172a',
                          margin: '2px 0 6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {toy.name}
                      </h4>

                      {/* Price Section */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#e11d48' }}>
                          ₹{salePrice}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          ₹{origPrice}
                        </span>
                      </div>

                      {/* Limited Stock Urgency */}
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#d97706', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⚡</span> Only few left at this price!
                      </div>

                      {/* Quick Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({ ...toy, price: salePrice });
                        }}
                        className="btn-press"
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 8px rgba(225, 29, 72, 0.3)'
                        }}
                      >
                        <ShoppingBag size={14} /> Claim Deal
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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

        {/* Filter Bar: Age Group & Sorting — Strict Single Line on Desktop, Responsive on Mobile */}
        <div className="catalog-filter-bar">
          {/* Left: Age Group Filter with Smooth Horizontal Scroll */}
          <div className="catalog-filter-bar-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: '800',
                color: '#92400e',
                background: '#fef3c7',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid #fde68a',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)'
              }}
            >
              <span>🎂</span> Age:
            </span>
            <div
              style={{
                display: 'flex',
                gap: '5px',
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {AGE_GROUPS_CONFIG.map((group) => {
                const isSelected = selectedAge === group.label;
                const pool = allToys.length > 0 ? allToys : toys;
                const count = group.label === 'All' ? pool.length : pool.filter(t => t.age_group === group.label).length;

                return (
                  <button
                    key={group.label}
                    className="btn-press"
                    onClick={() => setSelectedAge(group.label)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? '800' : '700',
                      border: isSelected ? `1.5px solid ${group.color}` : `1.5px solid ${group.border}`,
                      background: isSelected ? group.activeBg : group.bg,
                      color: isSelected ? '#ffffff' : group.color,
                      boxShadow: isSelected
                        ? '0 3px 10px rgba(0, 0, 0, 0.16)'
                        : '0 1px 2px rgba(0, 0, 0, 0.03)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{group.emoji}</span>
                    <span>{group.label}</span>
                    <span
                      style={{
                        background: isSelected ? 'rgba(255, 255, 255, 0.28)' : group.badgeBg,
                        color: isSelected ? '#ffffff' : group.badgeColor,
                        borderRadius: '9999px',
                        padding: '1px 5px',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        marginLeft: '1px'
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Sort Dropdown & Product Count */}
          <div className="catalog-filter-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
              {toys.length} toy{toys.length !== 1 ? 's' : ''} found
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={13} color="#64748b" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#334155',
                  cursor: 'pointer'
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

        {/* Digital Products (PDF Books / Activity Sheets) Showcase */}
        <DigitalBooksCatalog onNavigate={onNavigate} />
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
