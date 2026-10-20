import React, { useState, useEffect } from 'react';
import { ToyCard } from '../components/ToyCard';
import { Sparkles, ArrowUpDown, X, ShoppingBag, Zap, CheckCircle2, Truck, Award, Smile } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CATEGORIES = [
  'All',
  'RC & Vehicles',
  'Plush & Soft Toys',
  'Dolls & Playsets',
  'Building Blocks & Sets',
  'Outdoor & Action',
  'Board Games & Fun',
  'Musical & Sensory Toys'
];

// Updated Age Ranges matching discussion (chat line 124-126)
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedToyModal, setSelectedToyModal] = useState(null);

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

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Playful Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          color: 'white',
          padding: '42px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '680px' }}>
            <div className="badge badge-amber" style={{ marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <Sparkles size={14} /> Official Panda Nest Storefront • pandanest.in
            </div>
            <h1 style={{ fontSize: '2.5rem', lineHeight: 1.15, marginBottom: '12px', color: 'white' }}>
              Toys That Spark Wild Imaginations! 🚀
            </h1>
            <p style={{ fontSize: '1.05rem', opacity: 0.95, lineHeight: 1.5, marginBottom: '18px' }}>
              From turbo stunt racers to giant cuddly pandas and fairytale castles, find toys crafted for boundless playtime fun.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontWeight: '600' }}>
                <Truck size={15} />
                <span>FREE Delivery on All Toys Across India</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontWeight: '600' }}>
                <span>✨ 100% Child Safe</span>
              </div>
            </div>
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
            {CATEGORIES.map((cat) => (
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
            <div style={{ fontSize: '42px', marginBottom: '12px' }} className="animate-float">🐼</div>
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
              <div style={{ height: '320px', background: '#f8fafc', position: 'relative' }}>
                <img
                  src={selectedToyModal.image_url}
                  alt={selectedToyModal.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '12px', left: '16px', display: 'flex', gap: '8px' }}>
                  <span className="badge badge-green">{selectedToyModal.category}</span>
                  <span className="badge badge-blue">Age: {selectedToyModal.age_group}</span>
                </div>
              </div>

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

                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  {selectedToyModal.description}
                </p>

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
