import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RefreshCw, Award, Smile, Zap, BookOpen, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

const TRUTH_PROMPTS = [
  "If your favorite toy could speak for 1 hour, what would it say to you?",
  "What is your secret superhero power and what is your superhero name?",
  "If you could invent any toy in the whole universe, what would it do?",
  "What is the funniest face or silliest sound you can make right now?",
  "If animals could talk, which animal would you want as your best friend?",
  "What is the best dream or adventure you've ever imagined?",
  "If you had a magic wand for one day, what 3 wishes would you grant for your family?",
  "Which toy in the room is your secret favorite bedtime guardian?"
];

const DARE_PROMPTS = [
  "Walk across the room like a waddling baby penguin without laughing! 🐧",
  "Do your silliest robot dance for 15 seconds with robot beeps! 🤖",
  "Roar like a friendly baby dinosaur 3 times as loud as you can! 🦖",
  "Balance a soft toy or cushion on your head and spin around 3 times without dropping it! 🎪",
  "Pretend you are an astronaut floating in zero-gravity space for 20 seconds! 🚀",
  "Give the person closest to you your biggest, warmest panda bear hug! 🐼",
  "Act like a racecar driving at 200 MPH with engine sounds! 🏎️",
  "Sing your favorite nursery rhyme or song in a funny squeaky mouse voice! 🐭"
];

// 4 Alternating Wheel Quadrants
const WHEEL_SLICES = [
  { id: 0, type: 'truth', label: 'TRUTH', emoji: '💭', color: '#0284c7', bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)' },
  { id: 1, type: 'dare', label: 'DARE', emoji: '⚡', color: '#e11d48', bg: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
  { id: 2, type: 'truth', label: 'TRUTH', emoji: '💭', color: '#059669', bg: 'linear-gradient(135deg, #10b981, #059669)' },
  { id: 3, type: 'dare', label: 'DARE', emoji: '⚡', color: '#d97706', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' }
];

export function TruthOrDare({ onGoToCatalog }) {
  const [mode, setMode] = useState(null); // 'truth' or 'dare'
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [pointsEarned, setPointsEarned] = useState(() => {
    return parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10);
  });
  const [completedCount, setCompletedCount] = useState(0);
  const [featuredToys, setFeaturedToys] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeSlice, setActiveSlice] = useState(null);
  const [gameBook, setGameBook] = useState({
    title: 'Panda 100 Family Truth & Dare Party Cards Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-001.jpg',
    description: '100 printable Family Truth & Dare cards for unforgettable game nights, birthday parties & family bonding!'
  });

  const { addToCart, openBuyNow } = useCart();

  useEffect(() => {
    fetch('/api/toys?featured=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeaturedToys(data.slice(0, 4));
      })
      .catch(err => console.warn('Could not fetch toys for T/D', err));

    fetch('/api/game-books/truthDare')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.title) setGameBook(data);
      })
      .catch(() => {});
  }, []);

  const pickRandomPrompt = (type) => {
    setMode(type);
    let list = type === 'truth' ? TRUTH_PROMPTS : DARE_PROMPTS;
    try {
      const storageKey = type === 'truth' ? 'pandanest_custom_truths' : 'pandanest_custom_dares';
      const custom = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(custom) && custom.length > 0) {
        list = custom;
      }
    } catch {
      // fallback
    }
    const randomItem = list[Math.floor(Math.random() * list.length)];
    setCurrentPrompt(randomItem);
    return randomItem;
  };

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowPrompt(false);

    // Pick target slice: 0 (Truth), 1 (Dare), 2 (Truth), 3 (Dare)
    const targetSlice = Math.floor(Math.random() * 4);
    const selectedType = WHEEL_SLICES[targetSlice].type;
    setActiveSlice(targetSlice);

    // Geometry:
    // Slice 0 (Top: -45° to 45°), target angle = 0°
    // Slice 1 (Right: 45° to 135°), target angle = 270°
    // Slice 2 (Bottom: 135° to 225°), target angle = 180°
    // Slice 3 (Left: 225° to 315°), target angle = 90°
    const sliceAngles = [0, 270, 180, 90];
    const targetBase = sliceAngles[targetSlice];
    const jitter = (Math.random() - 0.5) * 40; // slight angle variation
    const extraRotations = 360 * 6; // 6 full spins
    const currentModulo = rotation % 360;
    const diff = (targetBase - currentModulo + 360) % 360;
    const finalRotation = rotation + extraRotations + diff + jitter;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      pickRandomPrompt(selectedType);
      setShowPrompt(true);
      confetti({
        particleCount: 75,
        spread: 75,
        origin: { y: 0.6 }
      });
    }, 3400);
  };

  const handleChallengeComplete = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    const newPoints = pointsEarned + 10;
    setPointsEarned(newPoints);
    setCompletedCount(prev => prev + 1);
    localStorage.setItem('pandanest_panda_points', String(newPoints));
    window.dispatchEvent(new Event('pandanest-points-updated'));

    const token = localStorage.getItem('pandanest_admin_token');
    if (token) {
      fetch('/api/users/add-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 10, reason: 'Truth or Dare Challenge' })
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && typeof data.panda_points === 'number') {
            setPointsEarned(data.panda_points);
            localStorage.setItem('pandanest_panda_points', String(data.panda_points));
            window.dispatchEvent(new Event('pandanest-points-updated'));
          }
        })
        .catch(() => {});
    }
  };

  const handleBuyBook = () => {
    openBuyNow({
      id: 'game-book-truth-dare',
      name: gameBook.title,
      price: gameBook.price,
      original_price: gameBook.original_price,
      image_url: gameBook.image_url,
      description: gameBook.description
    });
  };

  return (
    <div style={{ minHeight: '85vh', background: 'radial-gradient(circle at 50% 10%, #ecfdf5 0%, #ffffff 80%)', padding: '36px 16px' }}>
      <div className="container" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: '22px' }}>
          <div className="badge badge-amber" style={{ marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}>
            <Sparkles size={14} /> Panda Club 4-Quadrant Spin Wheel
          </div>
          <h1 style={{ fontSize: '2.4rem', color: '#0f172a', marginBottom: '8px', fontWeight: '900' }}>
            Panda Truth or Dare! 🐼🎡
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.02rem', lineHeight: 1.5, margin: 0 }}>
            Spin the 4-part wheel to alternate between <strong>Truth 💭</strong> and <strong>Dare ⚡</strong>! Earn <strong>+10 Panda Points</strong> every round!
          </p>

          {/* Points Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fef3c7',
              border: '1.5px solid #f59e0b',
              padding: '8px 20px',
              borderRadius: '24px',
              marginTop: '14px',
              fontWeight: '800',
              color: '#92400e',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
            }}
          >
            <Award size={18} color="#d97706" />
            <span>Your Panda Points: {pointsEarned} Points</span>
          </div>
        </div>

        {/* 4-Part Alternating Circular Spinner Wheel */}
        <div
          style={{
            background: 'white',
            borderRadius: '28px',
            border: '2px solid #a7f3d0',
            boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.18)',
            padding: '32px 20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Wheel Indicator Needle (12 o'clock pointing down) */}
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '36px',
              marginBottom: '-16px',
              zIndex: 10,
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '18px solid transparent',
                borderRight: '18px solid transparent',
                borderTop: '32px solid #ef4444',
                margin: '0 auto'
              }}
            />
          </div>

          {/* The Circular 4-Part Wheel */}
          <div
            style={{
              position: 'relative',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), inset 0 0 0 6px #ffffff',
              border: '6px solid #0f172a',
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              overflow: 'hidden'
            }}
            onClick={spinWheel}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 3.4s cubic-bezier(0.12, 0.85, 0.25, 1)' : 'none',
                position: 'relative'
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 300 300">
                <defs>
                  {/* Quadrant Gradients */}
                  <linearGradient id="grad-truth-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="grad-dare-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                  <linearGradient id="grad-truth-2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="grad-dare-2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>

                {/* 4 Quadrants alternating (-45 to 45: Truth, 45 to 135: Dare, 135 to 225: Truth, 225 to 315: Dare) */}
                {/* Quadrant 0: Top (-45° to 45°) -> TRUTH */}
                <path
                  d="M 150 150 L 46 46 A 147 147 0 0 1 254 46 Z"
                  fill="url(#grad-truth-1)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                {/* Quadrant 1: Right (45° to 135°) -> DARE */}
                <path
                  d="M 150 150 L 254 46 A 147 147 0 0 1 254 254 Z"
                  fill="url(#grad-dare-1)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                {/* Quadrant 2: Bottom (135° to 225°) -> TRUTH */}
                <path
                  d="M 150 150 L 254 254 A 147 147 0 0 1 46 254 Z"
                  fill="url(#grad-truth-2)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                {/* Quadrant 3: Left (225° to 315°) -> DARE */}
                <path
                  d="M 150 150 L 46 254 A 147 147 0 0 1 46 46 Z"
                  fill="url(#grad-dare-2)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />

                {/* Quadrant Text & Emoji Labels */}
                {/* Top: TRUTH */}
                <g transform="translate(150, 70)">
                  <text textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                    💭 TRUTH
                  </text>
                </g>
                {/* Right: DARE */}
                <g transform="translate(230, 156) rotate(90)">
                  <text textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                    ⚡ DARE
                  </text>
                </g>
                {/* Bottom: TRUTH */}
                <g transform="translate(150, 240) rotate(180)">
                  <text textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                    💭 TRUTH
                  </text>
                </g>
                {/* Left: DARE */}
                <g transform="translate(70, 156) rotate(270)">
                  <text textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                    ⚡ DARE
                  </text>
                </g>
              </svg>
            </div>

            {/* Center Panda Hub */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '4px solid #0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                zIndex: 5
              }}
            >
              <span style={{ fontSize: '26px', lineHeight: 1 }}>🐼</span>
              <span style={{ fontSize: '9px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>
                SPIN!
              </span>
            </div>
          </div>

          {/* Spin Wheel Button */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className="btn btn-primary btn-lg"
              style={{
                padding: '14px 32px',
                fontSize: '1.1rem',
                fontWeight: '900',
                background: isSpinning
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                cursor: isSpinning ? 'not-allowed' : 'pointer'
              }}
            >
              <span>{isSpinning ? '🎡 Spinning...' : '🎲 SPIN THE 4-PART WHEEL!'}</span>
            </button>
          </div>

          {/* Revealed Challenge Card */}
          {showPrompt && mode && (
            <div
              style={{
                width: '100%',
                marginTop: '28px',
                padding: '24px 20px',
                borderRadius: '20px',
                border: mode === 'truth' ? '2.5px solid #0ea5e9' : '2.5px solid #f43f5e',
                background: mode === 'truth' ? '#f0f9ff' : '#fff1f2',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: '900',
                    padding: '6px 18px',
                    borderRadius: '20px',
                    color: '#ffffff',
                    background: mode === 'truth' ? '#0284c7' : '#e11d48'
                  }}
                >
                  {mode === 'truth' ? '💭 LANDED ON TRUTH!' : '⚡ LANDED ON DARE!'}
                </span>
              </div>

              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  lineHeight: 1.45,
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1.5px dashed #cbd5e1',
                  margin: '12px 0 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                "{currentPrompt}"
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: '800' }}
                  onClick={handleChallengeComplete}
                >
                  <Award size={18} />
                  <span>Challenge Done! (+10 Points 🎉)</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '12px 20px', fontWeight: '700' }}
                  onClick={spinWheel}
                >
                  <RefreshCw size={16} />
                  <span>Spin Again 🎲</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Buy Game Book Section (Configured in Admin Panel) */}
        {gameBook && (
          <div
            style={{
              marginTop: '32px',
              background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
              border: '2px solid #fde047',
              borderRadius: '24px',
              padding: '24px 28px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              boxShadow: '0 10px 24px rgba(234, 179, 8, 0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', maxWidth: '440px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#fef08a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  border: '2px solid #eab308',
                  flexShrink: 0
                }}
              >
                📖
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>
                  ⭐ Official Game Activity Book
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: '2px 0 4px' }}>
                  {gameBook.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  {gameBook.description}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                  MRP ₹{gameBook.original_price}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#059669', lineHeight: 1 }}>
                  ₹{gameBook.price}
                </div>
              </div>
              <button
                onClick={handleBuyBook}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '12px 22px',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <ShoppingBag size={18} />
                <span>Buy Book Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Featured Toys Tray */}
        {featuredToys.length > 0 && (
          <div style={{ marginTop: '40px', textAlign: 'left', borderTop: '2px dashed #e2e8f0', paddingTop: '28px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>
                  🎯 Popular Party Toys
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                  Featured Toys for Game Night 🐼
                </h3>
              </div>
              <button onClick={onGoToCatalog} className="btn btn-secondary btn-sm">
                Browse All →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {featuredToys.map(toy => (
                <div
                  key={toy.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                  }}
                >
                  <img
                    src={toy.image_url || '/placeholder.jpg'}
                    alt={toy.name}
                    style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '12px', background: '#f8fafc', marginBottom: '10px' }}
                  />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {toy.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>₹{toy.price}</span>
                    <button onClick={() => addToCart(toy)} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
