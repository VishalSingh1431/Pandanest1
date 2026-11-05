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
      {/* Playful Hero Banner with Form (or Member Rewards Card for logged-in users) */}
      <section
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          color: 'white',
          padding: '28px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          className="container"
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '24px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Brand & Value Pitch */}
          <div>
            <div className="badge badge-amber" style={{ marginBottom: '10px', padding: '4px 12px', fontSize: '0.8rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Sparkles size={13} /> Official Panda Nest Storefront • pandanest.in
            </div>

            <h1 style={{ fontSize: '2.1rem', lineHeight: 1.18, marginBottom: '10px', color: 'white' }}>
              Toys That Spark Wild Imaginations! 🚀
            </h1>

            <p style={{ fontSize: '0.96rem', opacity: 0.95, lineHeight: 1.5, marginBottom: '16px', maxWidth: '490px' }}>
              From turbo stunt racers to giant cuddly pandas and fairytale castles, find toys crafted for boundless playtime fun.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '18px', fontWeight: '600' }}>
                <Truck size={15} />
                <span>FREE Delivery Across India</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '18px', fontWeight: '600' }}>
                <span>✨ 100% Child Safe</span>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded Toy Video Player Showcase (if logged in) OR Customer Onboarding Form (if guest) */}
          {isAuthenticated ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '14px',
                boxShadow: '0 14px 34px -8px rgba(0, 0, 0, 0.22)',
                color: '#0f172a',
                maxWidth: '450px',
                marginLeft: 'auto',
                width: '100%'
              }}
            >
              {/* Responsive 16:9 Video Container */}
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '14px',
                  background: '#000000',
                  marginBottom: '10px'
                }}
              >
                <iframe
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '14px'
                  }}
                  src="https://www.youtube-nocookie.com/embed/3vTfq_724jM?autoplay=0&rel=0"
                  title="Panda Toy Fun Adventures"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>
                    🎬 Panda Kids Club
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                    Baby Panda &amp; Wooden Toy Adventures 🐼
                  </h4>
                </div>
                <a
                  href="?page=games"
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: '#047857',
                    background: '#ecfdf5',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  More Videos →
                </a>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '20px 22px',
                boxShadow: '0 14px 34px -8px rgba(0, 0, 0, 0.22)',
                border: '1.5px solid rgba(255, 255, 255, 0.6)',
                color: '#0f172a',
                maxWidth: '450px',
                marginLeft: 'auto',
                width: '100%'
              }}
            >
              {heroSubmitted ? (
                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      background: '#ecfdf5',
                      color: '#10b981',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      boxShadow: '0 6px 16px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  {heroResult?.already_registered ? (
                    <>
                      <div className="badge badge-green" style={{ marginBottom: '8px', fontSize: '0.82rem' }}>
                        ⭐ Active Member Recognized
                      </div>
                      <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '6px' }}>
                        Welcome Back, {heroForm.child_name}! 🐼
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '14px' }}>
                        Your details are updated. Please log in to view your points balance and redeem them on checkout!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="badge badge-amber" style={{ marginBottom: '8px', fontSize: '0.82rem' }}>
                        🪙 You Got 100 Free Panda Points!
                      </div>
                      <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '6px' }}>
                        Welcome, {heroForm.child_name}! 🎉
                      </h3>
                      <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '14px' }}>
                        <strong>Please Note:</strong> Please <strong>log in or sign up</strong> now so your 100 points stay safe in your account. You can use them to get a discount right now or on any toy you buy later!
                      </p>
                    </>
                  )}

                  {!isAuthenticated ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginTop: '6px' }}>
                      <p style={{ fontSize: '0.78rem', color: '#ea580c', fontWeight: '600', margin: '0 0 10px', lineHeight: 1.4 }}>
                        ⚠️ If you leave this page without logging in, your 100 points will be lost!
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate('admin-login')}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '700'
                        }}
                      >
                        <Lock size={15} />
                        <span>Log In to Save &amp; Use My 100 Points</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: '600' }}>
                        ✓ All set! Your points are saved in your account and ready to use at checkout.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#ecfdf5', color: '#047857', padding: '5px', borderRadius: '8px' }}>
                      <Gift size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
                        Join Panda Club & Get 100 Pts 🎁
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Register child's birthday for special gifts & perks!
                      </span>
                    </div>
                  </div>

                  {heroError && (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#991b1b',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        marginBottom: '10px'
                      }}
                    >
                      {heroError}
                    </div>
                  )}

                  <form onSubmit={handleHeroSubmit}>
                    {/* Child Name & Mobile Number in a neat 2-col row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '3px' }}>
                          <Heart size={11} color="#ec4899" />
                          Child's Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                          placeholder="e.g. Aarav"
                          value={heroForm.child_name}
                          onChange={(e) => setHeroForm({ ...heroForm, child_name: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '3px' }}>
                          <Phone size={11} color="#059669" />
                          Mobile / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          className="form-input"
                          style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                          placeholder="10-digit number"
                          value={heroForm.phone}
                          onChange={(e) => setHeroForm({ ...heroForm, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Child's Date of Birth */}
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '3px' }}>
                        <Calendar size={11} color="#8b5cf6" />
                        Child's Date of Birth (DOB) *
                      </label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                        value={heroForm.dob}
                        onChange={(e) => setHeroForm({ ...heroForm, dob: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={heroLoading}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '9px', fontSize: '0.88rem' }}
                    >
                      <Award size={16} />
                      <span>{heroLoading ? 'Unlocking Points...' : 'Unlock 100 Points & Rewards'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

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
            padding: '12px 18px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Age Group Filter (0-3, 3-5, 5-8, 8-12, 12+) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Age Range:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {AGE_GROUPS.map((age) => (
                <button
                  key={age}
                  className="btn-press"
                  onClick={() => setSelectedAge(age)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: '1px solid',
                    borderColor: selectedAge === age ? '#10b981' : '#e2e8f0',
                    background: selectedAge === age ? '#ecfdf5' : '#f8fafc',
                    color: selectedAge === age ? '#059669' : '#64748b'
                  }}
                >
                  {age}
                </button>
              ))}
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
