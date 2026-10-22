import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ToyCard } from '../components/ToyCard';
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
  Star
} from 'lucide-react';
import { useCart } from '../context/CartContext';

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

export function Catalog({ searchQuery, onOpenTruthOrDare, onOpenWelcome }) {
  const [toys, setToys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedToyModal, setSelectedToyModal] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [toyReviewsData, setToyReviewsData] = useState({ reviews: [], averageRating: 0, totalReviews: 0 });

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
      }
    } catch (err) {
      console.error('Error fetching toys:', err);
    } finally {
      setLoading(false);
    }
  };

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit details');
      }

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
      {/* Playful Hero Banner with Form on the Right Side */}
      <section
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          color: 'white',
          padding: '46px 20px',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '36px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Brand & Value Pitch */}
          <div>
            <div className="badge badge-amber" style={{ marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <Sparkles size={14} /> Official Panda Nest Storefront • pandanest.in
            </div>

            <h1 style={{ fontSize: '2.6rem', lineHeight: 1.15, marginBottom: '14px', color: 'white' }}>
              Toys That Spark Wild Imaginations! 🚀
            </h1>

            <p style={{ fontSize: '1.05rem', opacity: 0.95, lineHeight: 1.55, marginBottom: '22px' }}>
              From turbo stunt racers to giant cuddly pandas and fairytale castles, find toys crafted for boundless playtime fun.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '7px 15px', borderRadius: '20px', fontWeight: '600' }}>
                <Truck size={16} />
                <span>FREE Delivery on All Toys Across India</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '7px 15px', borderRadius: '20px', fontWeight: '600' }}>
                <span>✨ 100% Child Safe</span>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded Customer Onboarding Form */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 24px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid rgba(255, 255, 255, 0.6)',
              color: '#0f172a',
              maxWidth: '460px',
              marginLeft: 'auto',
              width: '100%'
            }}
          >
            {heroSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    background: '#ecfdf5',
                    color: '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    boxShadow: '0 6px 16px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                {heroResult?.already_registered ? (
                  <>
                    <div className="badge badge-green" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                      ⭐ Active Member Recognized
                    </div>
                    <h3 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '6px' }}>
                      Welcome Back, {heroForm.child_name}! 🐼
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      Your child's details have been updated. (Note: The 100 welcome bonus points are only awarded on your initial registration).
                    </p>
                  </>
                ) : (
                  <>
                    <div className="badge badge-amber" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                      🪙 100 Panda Points Awarded!
                    </div>
                    <h3 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '6px' }}>
                      Welcome to Panda Club, {heroForm.child_name}! 🎉
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      Your points are ready to redeem at checkout. We'll celebrate your child's birthday with special gifts!
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ background: '#ecfdf5', color: '#047857', padding: '6px', borderRadius: '10px' }}>
                    <Gift size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.2 }}>
                      Join Panda Club & Get 100 Pts 🎁
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
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
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      marginBottom: '14px'
                    }}
                  >
                    {heroError}
                  </div>
                )}

                <form onSubmit={handleHeroSubmit}>
                  {/* Child Name */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Heart size={13} color="#ec4899" />
                      Child's Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                      placeholder="e.g. Aarav / Ananya"
                      value={heroForm.child_name}
                      onChange={(e) => setHeroForm({ ...heroForm, child_name: e.target.value })}
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Phone size={13} color="#059669" />
                      Mobile / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      className="form-input"
                      style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                      placeholder="e.g. 7380405227"
                      value={heroForm.phone}
                      onChange={(e) => setHeroForm({ ...heroForm, phone: e.target.value })}
                    />
                  </div>

                  {/* Child's Date of Birth */}
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Calendar size={13} color="#8b5cf6" />
                      Child's Date of Birth (DOB) *
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                      value={heroForm.dob}
                      onChange={(e) => setHeroForm({ ...heroForm, dob: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={heroLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  >
                    <Award size={18} />
                    <span>{heroLoading ? 'Unlocking Points...' : 'Unlock 100 Points & Rewards'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Panda Club Play & Win Banner */}
      <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '10px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#92400e', fontWeight: '700' }}>
            <Award size={18} color="#d97706" />
            <span>Panda Club: Play More. Learn More. Earn Rewards!</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onOpenTruthOrDare}
              style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#b45309',
                background: 'white',
                border: '1px solid #f59e0b',
                padding: '4px 12px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Smile size={13} /> Play Truth or Dare 🎲
            </button>
            <button
              onClick={onOpenWelcome}
              style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#047857',
                background: '#ecfdf5',
                border: '1px solid #10b981',
                padding: '4px 12px',
                borderRadius: '12px'
              }}
            >
              Get 100 Points 🎁
            </button>
          </div>
        </div>
      </div>

      {/* Main Catalog Body */}
      <main className="container" style={{ marginTop: '28px' }}>
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '24px'
            }}
          >
            {toys.map((toy) => (
              <ToyCard key={toy.id} toy={toy} onSelectToy={(t) => setSelectedToyModal(t)} />
            ))}
          </div>
        )}
      </main>

      {/* Toy Detail Quick-View Modal */}
      {selectedToyModal && (
        <div className="modal-overlay" onClick={() => setSelectedToyModal(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '650px', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedToyModal(null)}
              style={{ top: '14px', right: '14px', zIndex: 10 }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
              {/* Product Gallery (Multiple Images Support) */}
              {(() => {
                const imgList = Array.isArray(selectedToyModal.images) && selectedToyModal.images.length > 0
                  ? selectedToyModal.images
                  : [selectedToyModal.image_url];
                const activeImg = imgList[activeImageIndex] || imgList[0];

                return (
                  <div>
                    <div style={{ height: '340px', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={activeImg}
                        alt={selectedToyModal.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc' }}
                      />
                      <div style={{ position: 'absolute', bottom: '12px', left: '16px', display: 'flex', gap: '8px' }}>
                        <span className="badge badge-green">{selectedToyModal.category}</span>
                        <span className="badge badge-blue">Age: {selectedToyModal.age_group}</span>
                      </div>
                      {imgList.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '12px',
                            right: '16px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {activeImageIndex + 1} / {imgList.length}
                        </div>
                      )}
                    </div>

                    {/* Image Thumbnails bar */}
                    {imgList.length > 1 && (
                      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
                        {imgList.map((thumb, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              padding: 0,
                              border: activeImageIndex === idx ? '2.5px solid #10b981' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              background: '#f8fafc',
                              flexShrink: 0
                            }}
                          >
                            <img src={thumb} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '8px' }}>
                  {selectedToyModal.name}
                </h2>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#047857', fontFamily: 'var(--font-display)' }}>
                    ₹{Number(selectedToyModal.price).toLocaleString('en-IN')}
                  </span>
                  {selectedToyModal.original_price && (
                    <span style={{ fontSize: '1.05rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                      ₹{Number(selectedToyModal.original_price).toLocaleString('en-IN')}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                    ✔ Free Delivery Across India
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        color={toyReviewsData.averageRating >= s ? '#f59e0b' : '#cbd5e1'}
                        fill={toyReviewsData.averageRating >= s ? '#f59e0b' : 'none'}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                    {toyReviewsData.averageRating > 0 ? toyReviewsData.averageRating : '5.0'} / 5.0
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ({toyReviewsData.totalReviews} verified {toyReviewsData.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  {selectedToyModal.description}
                </p>

                {/* Embedded YouTube Video (if linked) */}
                {selectedToyModal.video_url && getYouTubeEmbedUrl(selectedToyModal.video_url) && (
                  <div style={{ marginBottom: '22px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#ef4444' }}>▶</span> Watch Toy in Action / Demo Video:
                    </h4>
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                      <iframe
                        src={getYouTubeEmbedUrl(selectedToyModal.video_url)}
                        title={`${selectedToyModal.name} Video Demo`}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Verified Customer Reviews Section */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                    Verified Parent Reviews & Ratings:
                  </h4>
                  {toyReviewsData.reviews.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', color: '#64748b' }}>
                      🌟 Be the first verified buyer to rate this toy after delivery!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {toyReviewsData.reviews.map((r) => (
                        <div key={r.id} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>{r.user_name}</span>
                              <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Verified Buyer</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1px' }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={12}
                                  color={r.rating >= s ? '#f59e0b' : '#cbd5e1'}
                                  fill={r.rating >= s ? '#f59e0b' : 'none'}
                                />
                              ))}
                            </div>
                          </div>
                          {r.comment && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                              "{r.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '12px' }}
                    onClick={() => {
                      addToCart(selectedToyModal);
                      setSelectedToyModal(null);
                    }}
                  >
                    <ShoppingBag size={18} />
                    <span>Add to Bag</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '12px' }}
                    onClick={() => {
                      buyNow(selectedToyModal);
                      setSelectedToyModal(null);
                    }}
                  >
                    <Zap size={18} />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
