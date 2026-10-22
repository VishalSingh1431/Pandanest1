import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Tv,
  Award,
  Sparkles,
  CheckCircle2,
  Play,
  RotateCcw,
  Smile,
  Clock,
  HelpCircle,
  ShoppingBag,
  Lock,
  Unlock,
  Flame,
  Zap,
  Volume2,
  VolumeX,
  Target,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// YouTube Videos curated for kids & toys
const TOY_VIDEOS = [
  {
    id: 'V1',
    youtubeId: '3vTfq_724jM',
    title: 'Baby Panda Cute Cartoon Adventures 🐼',
    category: 'Cartoons',
    channel: 'Panda Nest Kids Club',
    durationSec: 30,
    description: 'Join the playful little panda cub as he explores the bamboo forest and builds colorful wooden toy nests with friends.'
  },
  {
    id: 'V2',
    youtubeId: 'u7r6q69P0rQ',
    title: 'High Speed RC Stunt Cars & Monster Truck Showcase 🏎️',
    category: 'RC & Action',
    channel: 'Toy Arena',
    durationSec: 30,
    description: 'Watch incredible 360-degree tumbling spins, off-road ramp jumps, and glow-in-the-dark stunt drifting in action!'
  },
  {
    id: 'V3',
    youtubeId: 'Y9j4LhD1w30',
    title: 'Magical Dollhouse Castle & Princess Fairytale Play 🏰',
    category: 'Pretend Play',
    channel: 'Creative Playroom',
    durationSec: 30,
    description: 'Step into the enchanted miniature fairytale castle with light-up balconies, miniature royal tea sets, and magical storytelling.'
  },
  {
    id: 'V4',
    youtubeId: '4x3_h9R8a9M',
    title: 'Gatling Bubble Gun Mega Foam Party 🫧',
    category: 'Outdoor & Summer',
    channel: 'Panda Nest Kids Club',
    durationSec: 30,
    description: 'Watch over 5,000 rainbow bubbles blast across the sunny garden lawn with the electric Gatling Bubble Storm Cannon!'
  },
  {
    id: 'V5',
    youtubeId: '8v_44jV4n1Y',
    title: 'Magnetic Building Blocks Castle & Tower Challenge 🧱',
    category: 'STEM & Learning',
    channel: 'Smart Kids Lab',
    durationSec: 30,
    description: 'Learn how to construct colorful 3D geometric domes, giant suspension bridges, and skyscraper towers with magnetic tiles.'
  },
  {
    id: 'V6',
    youtubeId: '6z1p3W7v9u8',
    title: 'Dancing Musical Panda with Rainbow Disco Lights 🎶',
    category: 'Musical & Plush',
    channel: 'Panda Nest Kids Club',
    durationSec: 30,
    description: 'Sing and dance along with the joyful robotic walking panda as it spins and shines glowing LED party lights!'
  }
];

// Memory Game Cards
const MEMORY_ICONS = ['🐼', '🏎️', '🏰', '🚀', '🧸', '🫧'];

// Trivia Questions
const TRIVIA_QUESTIONS = [
  {
    question: "I have 4 big wheels, can do 360-degree tumble spins, and am driven by a remote control. What toy am I?",
    options: ["RC Stunt Drift Car", "Wooden Xylophone", "Giant Teddy Bear"],
    correct: 0
  },
  {
    question: "I am super cuddly, black and white, love bamboo, and protect your dreams at bedtime. Who am I?",
    options: ["Gatling Bubble Gun", "Panda Plush Toy", "Race Track Set"],
    correct: 1
  },
  {
    question: "How many colorful bubbles can our Gatling Bubble Storm Cannon make in 1 minute?",
    options: ["10 bubbles", "Over 5,000 bubbles!", "Only 5 bubbles"],
    correct: 1
  },
  {
    question: "Which magical toy lets you build high towers, creative bridges, and castles?",
    options: ["Magnetic Construction Blocks", "Drawing Chalk", "Baby Rattle"],
    correct: 0
  }
];

// Truth or Dare questions
const TRUTHS_AND_DARES = [
  { type: 'truth', text: "What is your all-time favorite toy in the whole wide world and why?" },
  { type: 'dare', text: "Do your best, loudest impression of a happy panda bear eating bamboo! 🐼" },
  { type: 'truth', text: "If you could invent any magical toy, what would it do?" },
  { type: 'dare', text: "Walk across the room like a toy robot with funny mechanical beep-boop sounds! 🤖" },
  { type: 'dare', text: "Give the person closest to you your biggest, warmest panda bear hug! 🐼" }
];

export function GamesAndActivities({ onGoToCatalog, onRequireLogin }) {
  const { isAuthenticated, admin } = useAuth();

  const [activeTab, setActiveTab] = useState('games'); // 'games' | 'videos'
  const [selectedGame, setSelectedGame] = useState('balloon'); // 'balloon' | 'memory' | 'trivia' | 'truth-dare'
  const [points, setPoints] = useState(() => parseInt(localStorage.getItem('pandanest_panda_points') || '100', 10));

  // --- GAME 1: PANDA BALLOON POPPER ---
  const [balloonScore, setBalloonScore] = useState(0);
  const [balloonTimeLeft, setBalloonTimeLeft] = useState(25);
  const [isBalloonPlaying, setIsBalloonPlaying] = useState(false);
  const [balloonGameOver, setBalloonGameOver] = useState(false);
  const [balloons, setBalloons] = useState([]);
  const [highestBalloonScore, setHighestBalloonScore] = useState(() => {
    return parseInt(localStorage.getItem('pandanest_high_balloon_score') || '0', 10);
  });

  // --- GAME 2: PANDA BAMBOO CATCH (Super Easy & Fun for Kids 5-12) ---
  const [bambooScore, setBambooScore] = useState(0);
  const [bambooTimeLeft, setBambooTimeLeft] = useState(25);
  const [isBambooPlaying, setIsBambooPlaying] = useState(false);
  const [bambooGameOver, setBambooGameOver] = useState(false);
  const [basketX, setBasketX] = useState(50); // percentage 10% to 90%
  const [fallingItems, setFallingItems] = useState([]);

  // --- GAME 3: LUCKY TOY SPIN WHEEL ---
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelPrize, setWheelPrize] = useState(null);
  const [hasSpunToday, setHasSpunToday] = useState(() => {
    const lastSpun = localStorage.getItem('pandanest_last_spin_date');
    return lastSpun === new Date().toISOString().split('T')[0];
  });

  // --- GAME 4: MEMORY FLIP ---
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [memoryWon, setMemoryWon] = useState(false);

  // --- GAME 5: TRIVIA ---
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [triviaWon, setTriviaWon] = useState(false);

  // --- GAME 6: TRUTH OR DARE ---
  const [currentPrompt, setCurrentPrompt] = useState(TRUTHS_AND_DARES[0]);
  const [promptCompleted, setPromptCompleted] = useState(false);

  // --- VIDEOS ZONE ---
  const [videoList, setVideoList] = useState(TOY_VIDEOS);
  const [selectedVideoCategory, setSelectedVideoCategory] = useState('All');
  const [activeVideo, setActiveVideo] = useState(TOY_VIDEOS[0]);
  const [watching, setWatching] = useState(false);
  const [watchTimer, setWatchTimer] = useState(30);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [completedVideos, setCompletedVideos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pandanest_watched_videos') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch dynamic videos from API
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map(v => ({
              id: String(v.id),
              youtubeId: v.youtube_id || v.youtubeId,
              title: v.title,
              category: v.category || 'Cartoons',
              channel: v.channel || 'Panda Nest Kids Club',
              durationSec: v.duration_sec || v.durationSec || 30,
              pointsReward: v.points_reward || 10,
              description: v.description || ''
            }));
            setVideoList(mapped);
            setActiveVideo(mapped[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch videos from server, using default list:', err);
      }
    };
    fetchVideos();
  }, []);

  // Award Panda Points Helper
  const awardPoints = (amount = 10, reason = 'Game Completed') => {
    const newPoints = points + amount;
    setPoints(newPoints);
    localStorage.setItem('pandanest_panda_points', String(newPoints));

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  // --- Balloon Popper Logic ---
  const BALLOON_TYPES = [
    { emoji: '🎈', points: 1, color: '#ef4444', size: 54 },
    { emoji: '🐼', points: 3, color: '#10b981', size: 60, special: true },
    { emoji: '⭐', points: 2, color: '#f59e0b', size: 50 },
    { emoji: '🎁', points: 5, color: '#8b5cf6', size: 62, special: true },
    { emoji: '✨', points: 2, color: '#ec4899', size: 48 }
  ];

  const startBalloonGame = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setBalloonScore(0);
    setBalloonTimeLeft(25);
    setIsBalloonPlaying(true);
    setBalloonGameOver(false);
    setBalloons([]);
  };

  // Spawn balloons while playing
  useEffect(() => {
    let spawnInterval = null;
    if (isBalloonPlaying && balloonTimeLeft > 0) {
      spawnInterval = setInterval(() => {
        setBalloons((prev) => {
          if (prev.length >= 8) return prev;
          const randomType = BALLOON_TYPES[Math.floor(Math.random() * BALLOON_TYPES.length)];
          const newBalloon = {
            id: Date.now() + Math.random(),
            x: Math.floor(Math.random() * 82) + 6, // 6% to 88%
            y: 105, // start from bottom
            speed: Math.random() * 1.5 + 2.2, // float speed
            ...randomType
          };
          return [...prev, newBalloon];
        });
      }, 700);
    }
    return () => clearInterval(spawnInterval);
  }, [isBalloonPlaying, balloonTimeLeft]);

  // Balloon physics (float up)
  useEffect(() => {
    let animationFrame = null;
    if (isBalloonPlaying) {
      animationFrame = setInterval(() => {
        setBalloons((prev) =>
          prev
            .map((b) => ({ ...b, y: b.y - b.speed }))
            .filter((b) => b.y > -20)
        );
      }, 50);
    }
    return () => clearInterval(animationFrame);
  }, [isBalloonPlaying]);

  // Balloon timer countdown
  useEffect(() => {
    let timer = null;
    if (isBalloonPlaying && balloonTimeLeft > 0) {
      timer = setInterval(() => {
        setBalloonTimeLeft((t) => {
          if (t <= 1) {
            setIsBalloonPlaying(false);
            setBalloonGameOver(true);
            setBalloons([]);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBalloonPlaying, balloonTimeLeft]);

  // Check game over score
  useEffect(() => {
    if (balloonGameOver) {
      if (balloonScore > highestBalloonScore) {
        setHighestBalloonScore(balloonScore);
        localStorage.setItem('pandanest_high_balloon_score', String(balloonScore));
      }
      if (balloonScore >= 15) {
        awardPoints(15, 'Panda Balloon Popper Champion');
      } else if (balloonScore >= 8) {
        awardPoints(10, 'Panda Balloon Popper Winner');
      }
    }
  }, [balloonGameOver]);

  const popBalloon = (bId, pts) => {
    setBalloonScore((s) => s + pts);
    setBalloons((prev) => prev.filter((b) => b.id !== bId));
  };

  // --- Bamboo Catch Game Mechanics ---
  const BAMBOO_ITEMS = [
    { emoji: '🎋', points: 1, name: 'Bamboo' },
    { emoji: '🎍', points: 2, name: 'Golden Bamboo' },
    { emoji: '🍎', points: 1, name: 'Sweet Apple' },
    { emoji: '⭐', points: 3, name: 'Lucky Star' }
  ];

  const startBambooGame = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setBambooScore(0);
    setBambooTimeLeft(25);
    setIsBambooPlaying(true);
    setBambooGameOver(false);
    setFallingItems([]);
    setBasketX(50);
  };

  // Spawn falling bamboo items
  useEffect(() => {
    let interval = null;
    if (isBambooPlaying && bambooTimeLeft > 0) {
      interval = setInterval(() => {
        setFallingItems((prev) => {
          if (prev.length >= 6) return prev;
          const randomItem = BAMBOO_ITEMS[Math.floor(Math.random() * BAMBOO_ITEMS.length)];
          const newItem = {
            id: Date.now() + Math.random(),
            x: Math.floor(Math.random() * 80) + 10,
            y: -10,
            speed: Math.random() * 1.5 + 2.5,
            ...randomItem
          };
          return [...prev, newItem];
        });
      }, 750);
    }
    return () => clearInterval(interval);
  }, [isBambooPlaying, bambooTimeLeft]);

  // Falling bamboo physics & collision detection with Panda Basket
  useEffect(() => {
    let anim = null;
    if (isBambooPlaying) {
      anim = setInterval(() => {
        setFallingItems((prev) => {
          const next = [];
          for (let item of prev) {
            const nextY = item.y + item.speed;
            // Check collision with basket at y ~ 75% to 88%
            if (nextY >= 72 && nextY <= 85) {
              const distance = Math.abs(item.x - basketX);
              if (distance <= 14) {
                // Caught!
                setBambooScore((s) => s + item.points);
                continue;
              }
            }
            if (nextY <= 100) {
              next.push({ ...item, y: nextY });
            }
          }
          return next;
        });
      }, 50);
    }
    return () => clearInterval(anim);
  }, [isBambooPlaying, basketX]);

  // Bamboo game countdown
  useEffect(() => {
    let timer = null;
    if (isBambooPlaying && bambooTimeLeft > 0) {
      timer = setInterval(() => {
        setBambooTimeLeft((t) => {
          if (t <= 1) {
            setIsBambooPlaying(false);
            setBambooGameOver(true);
            setFallingItems([]);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBambooPlaying, bambooTimeLeft]);

  // Bamboo game reward
  useEffect(() => {
    if (bambooGameOver) {
      if (bambooScore >= 12) {
        awardPoints(15, 'Bamboo Catch Master');
      } else if (bambooScore >= 6) {
        awardPoints(10, 'Bamboo Catch Winner');
      }
    }
  }, [bambooGameOver]);

  // --- Lucky Spin Wheel Mechanics ---
  const WHEEL_PRIZES = [
    { label: '+10 Points', points: 10, color: '#f59e0b', emoji: '🪙' },
    { label: '+25 Points', points: 25, color: '#10b981', emoji: '🎉' },
    { label: '+5 Points', points: 5, color: '#3b82f6', emoji: '⭐' },
    { label: '+50 Points', points: 50, color: '#8b5cf6', emoji: '👑' },
    { label: '+15 Points', points: 15, color: '#ec4899', emoji: '🎁' },
    { label: '+20 Points', points: 20, color: '#059669', emoji: '🐼' }
  ];

  const handleSpinWheel = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (isSpinning || hasSpunToday) return;

    setIsSpinning(true);
    setWheelPrize(null);

    const randomIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const degreesPerSegment = 360 / WHEEL_PRIZES.length;
    // 5 full rotations + landing segment
    const targetDegree = 360 * 5 + (WHEEL_PRIZES.length - 1 - randomIndex) * degreesPerSegment + 30;

    setWheelRotation(targetDegree);

    setTimeout(() => {
      setIsSpinning(false);
      const won = WHEEL_PRIZES[randomIndex];
      setWheelPrize(won);
      awardPoints(won.points, `Spin Wheel Prize: ${won.label}`);
      setHasSpunToday(true);
      localStorage.setItem('pandanest_last_spin_date', new Date().toISOString().split('T')[0]);
    }, 4000);
  };

  // --- Memory Game Logic ---
  const initMemoryGame = () => {
    const deck = [...MEMORY_ICONS, ...MEMORY_ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon, isFlipped: false }));
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setMemoryWon(false);
  };

  useEffect(() => {
    initMemoryGame();
  }, []);

  const handleCardClick = (index) => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (flipped.length === 2 || matched.includes(index) || flipped.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].icon === cards[second].icon) {
        const newMatched = [...matched, first, second];
        setMatched(newMatched);
        setFlipped([]);

        if (newMatched.length === cards.length) {
          setMemoryWon(true);
          awardPoints(10, 'Memory Game Completed');
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  // --- Trivia Logic ---
  const handleTriviaAnswer = (optIndex) => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (triviaAnswered) return;
    setSelectedOption(optIndex);
    setTriviaAnswered(true);

    const isCorrect = optIndex === TRIVIA_QUESTIONS[triviaIndex].correct;
    const newScore = isCorrect ? triviaScore + 1 : triviaScore;
    if (isCorrect) setTriviaScore(newScore);

    setTimeout(() => {
      if (triviaIndex + 1 < TRIVIA_QUESTIONS.length) {
        setTriviaIndex(triviaIndex + 1);
        setTriviaAnswered(false);
        setSelectedOption(null);
      } else {
        setTriviaWon(true);
        if (newScore >= 2) {
          awardPoints(10, 'Trivia Quiz Completed');
        }
      }
    }, 1100);
  };

  // --- Video Watch Logic ---
  useEffect(() => {
    let interval = null;
    if (watching && watchTimer > 0) {
      interval = setInterval(() => {
        setWatchTimer((t) => {
          if (t <= 1) {
            setWatching(false);
            setVideoCompleted(true);
            const updated = [...new Set([...completedVideos, activeVideo.id])];
            setCompletedVideos(updated);
            localStorage.setItem('pandanest_watched_videos', JSON.stringify(updated));
            awardPoints(10, `Watched ${activeVideo.title}`);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [watching, watchTimer, activeVideo]);

  const startWatchingVideo = (video) => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setActiveVideo(video);
    setVideoCompleted(completedVideos.includes(video.id));
    setWatchTimer(video.durationSec);
    setWatching(true);
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '88vh', padding: '36px 0 60px' }}>
      <div className="container" style={{ maxWidth: '1060px' }}>

        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '24px',
            padding: '34px 30px',
            color: '#ffffff',
            boxShadow: '0 16px 36px -10px rgba(245, 158, 11, 0.35)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.25)',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '700',
                marginBottom: '10px'
              }}
            >
              <Sparkles size={14} /> Panda Play &amp; Earn Zone
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', margin: '0 0 8px', lineHeight: 1.15 }}>
              Interactive Games &amp; Fun Activities 🎮🎈
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.95, maxWidth: '520px', lineHeight: 1.5 }}>
              Tap balloons, match cards, answer fun riddles, or watch toy cartoons to earn <strong>real Panda Points</strong>!
            </p>
          </div>

          {/* Points Balance Pill */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '16px 24px',
              color: '#0f172a',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              textAlign: 'center',
              minWidth: '150px'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Your Balance
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Award size={22} color="#d97706" />
              <span>{points} pts</span>
            </div>
          </div>
        </div>

        {/* LOCKED BANNER FOR GUEST USERS */}
        {!isAuthenticated && (
          <div
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
              borderRadius: '20px',
              padding: '24px 28px',
              color: '#ffffff',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              boxShadow: '0 12px 28px -6px rgba(4, 120, 87, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Lock size={26} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 4px', color: '#ffffff' }}>
                  Member-Only Gameplay &amp; Points Rewards 🔒
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.4 }}>
                  Log in or sign up with your child's name &amp; birthday to unlock instant gameplay, save your high scores, and claim +100 bonus Panda Points!
                </p>
              </div>
            </div>

            <button
              onClick={() => onRequireLogin && onRequireLogin()}
              style={{
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <Unlock size={18} />
              <span>Sign In / Register to Play</span>
            </button>
          </div>
        )}

        {/* Section Tabs (Games vs Toy Cartoons) */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('games')}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'games' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'games' ? '#0f172a' : '#64748b',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: activeTab === 'games' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Gamepad2 size={20} color={activeTab === 'games' ? '#f59e0b' : '#64748b'} />
            <span>Interactive Mini-Games</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'videos' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'videos' ? '#0f172a' : '#64748b',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: activeTab === 'videos' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Tv size={20} color={activeTab === 'videos' ? '#10b981' : '#64748b'} />
            <span>Toy Cartoons &amp; Reviews</span>
          </button>
        </div>

        {/* --- 1. GAMES HUB --- */}
        {activeTab === 'games' && (
          <div>
            {/* Game Selector Sub-Tabs */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => setSelectedGame('balloon')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'balloon' ? '#f59e0b' : '#e2e8f0',
                  background: selectedGame === 'balloon' ? '#fef3c7' : '#ffffff',
                  color: selectedGame === 'balloon' ? '#b45309' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🎈 Panda Balloon Popper
              </button>

              <button
                onClick={() => setSelectedGame('bamboo')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'bamboo' ? '#10b981' : '#e2e8f0',
                  background: selectedGame === 'bamboo' ? '#ecfdf5' : '#ffffff',
                  color: selectedGame === 'bamboo' ? '#047857' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🎋 Panda Bamboo Catch
              </button>

              <button
                onClick={() => setSelectedGame('wheel')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'wheel' ? '#ec4899' : '#e2e8f0',
                  background: selectedGame === 'wheel' ? '#fdf2f8' : '#ffffff',
                  color: selectedGame === 'wheel' ? '#db2777' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🎡 Lucky Spin Wheel
              </button>

              <button
                onClick={() => setSelectedGame('memory')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'memory' ? '#10b981' : '#e2e8f0',
                  background: selectedGame === 'memory' ? '#ecfdf5' : '#ffffff',
                  color: selectedGame === 'memory' ? '#047857' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🎴 Memory Card Match
              </button>

              <button
                onClick={() => setSelectedGame('trivia')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'trivia' ? '#3b82f6' : '#e2e8f0',
                  background: selectedGame === 'trivia' ? '#eff6ff' : '#ffffff',
                  color: selectedGame === 'trivia' ? '#1d4ed8' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                ❓ Toy Riddles &amp; Trivia
              </button>

              <button
                onClick={() => setSelectedGame('truth-dare')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'truth-dare' ? '#8b5cf6' : '#e2e8f0',
                  background: selectedGame === 'truth-dare' ? '#f5f3ff' : '#ffffff',
                  color: selectedGame === 'truth-dare' ? '#6d28d9' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                🎲 Truth or Dare Spinner
              </button>
            </div>

            {/* --- GAME 1: PANDA BALLOON POPPER --- */}
            {selectedGame === 'balloon' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Game Top Stats Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: '800', margin: '0 0 4px' }}>
                      Panda Balloon Popper 🎈
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                      Tap and pop the floating balloons before they fly away! Score 15+ to win <strong>+15 PP</strong>.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ background: '#fef3c7', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', color: '#b45309', fontSize: '0.85rem' }}>
                      🏆 Best: {highestBalloonScore}
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', color: '#047857', fontSize: '0.85rem' }}>
                      🎯 Score: {balloonScore}
                    </div>
                    <div style={{ background: '#fee2e2', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', color: '#dc2626', fontSize: '0.85rem' }}>
                      ⏱️ {balloonTimeLeft}s
                    </div>
                  </div>
                </div>

                {/* Game Canvas Area */}
                <div
                  style={{
                    position: 'relative',
                    height: '360px',
                    background: 'radial-gradient(circle at 50% 30%, #e0f2fe 0%, #bae6fd 100%)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '2px solid #7dd3fc',
                    cursor: isBalloonPlaying ? 'crosshair' : 'default',
                    userSelect: 'none'
                  }}
                >
                  {/* Floating Cloud Background Elements */}
                  <div style={{ position: 'absolute', top: '15px', left: '10%', fontSize: '32px', opacity: 0.7 }}>☁️</div>
                  <div style={{ position: 'absolute', top: '40px', right: '15%', fontSize: '42px', opacity: 0.6 }}>☁️</div>
                  <div style={{ position: 'absolute', top: '90px', left: '40%', fontSize: '28px', opacity: 0.5 }}>☁️</div>

                  {/* Active Floating Balloons */}
                  {isBalloonPlaying &&
                    balloons.map((b) => (
                      <div
                        key={b.id}
                        onMouseDown={() => popBalloon(b.id, b.points)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          popBalloon(b.id, b.points);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          fontSize: `${b.size}px`,
                          cursor: 'pointer',
                          transform: 'translate(-50%, -50%)',
                          animation: 'pulse 1s infinite alternate',
                          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                          transition: 'transform 0.1s'
                        }}
                      >
                        {b.emoji}
                      </div>
                    ))}

                  {/* Overlay: Locked or Not Started or Game Over */}
                  {!isAuthenticated ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(15, 23, 42, 0.65)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        padding: '24px',
                        textAlign: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          background: 'rgba(255,255,255,0.15)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '14px'
                        }}
                      >
                        <Lock size={32} color="#fbbf24" />
                      </div>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 6px' }}>
                        Panda Balloon Popper is Locked
                      </h4>
                      <p style={{ maxWidth: '400px', fontSize: '0.9rem', opacity: 0.9, marginBottom: '20px' }}>
                        Sign in or register your child to pop colorful balloons, beat the high score, and win real toy discounts!
                      </p>
                      <button
                        onClick={() => onRequireLogin && onRequireLogin()}
                        style={{
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 28px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Unlock size={18} />
                        <span>Log In to Unlock &amp; Play</span>
                      </button>
                    </div>
                  ) : !isBalloonPlaying && !balloonGameOver ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '20px'
                      }}
                    >
                      <div style={{ fontSize: '50px', marginBottom: '8px' }}>🎈🐼</div>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                        Ready to Pop Balloons?
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', marginBottom: '18px' }}>
                        Pop as many balloons &amp; surprise panda packages as you can in 25 seconds!
                      </p>
                      <button
                        onClick={startBalloonGame}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 32px',
                          borderRadius: '14px',
                          fontSize: '1.05rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Play size={18} fill="white" />
                        <span>Start Game Now</span>
                      </button>
                    </div>
                  ) : balloonGameOver ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.92)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '20px'
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                        {balloonScore >= 15 ? '🏆🎉' : '👏🎈'}
                      </div>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                        Time's Up! You Scored {balloonScore} Points!
                      </h4>
                      <p style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem', margin: '0 0 16px' }}>
                        {balloonScore >= 15
                          ? '🌟 Fantastic reflexes! +15 Panda Points Awarded!'
                          : balloonScore >= 8
                          ? 'Great job! +10 Panda Points Awarded!'
                          : 'Nice try! Pop faster next time to earn bonus points!'}
                      </p>
                      <button
                        onClick={startBalloonGame}
                        style={{
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 24px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RotateCcw size={16} />
                        <span>Play Again</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* --- GAME 2: PANDA BAMBOO CATCH (Age 5-12 Friendly) --- */}
            {selectedGame === 'bamboo' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Stats Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: '800', margin: '0 0 4px' }}>
                      Panda Bamboo Catch 🎋🐼
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                      Move the Panda Basket left &amp; right with your mouse, finger, or arrow buttons to catch delicious bamboo shoots and stars!
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ background: '#ecfdf5', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', color: '#047857', fontSize: '0.85rem' }}>
                      🎯 Caught: {bambooScore}
                    </div>
                    <div style={{ background: '#fee2e2', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', color: '#dc2626', fontSize: '0.85rem' }}>
                      ⏱️ {bambooTimeLeft}s
                    </div>
                  </div>
                </div>

                {/* Bamboo Catch Stage */}
                <div
                  onMouseMove={(e) => {
                    if (!isBambooPlaying) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    setBasketX(Math.max(10, Math.min(90, percent)));
                  }}
                  onTouchMove={(e) => {
                    if (!isBambooPlaying || !e.touches[0]) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
                    setBasketX(Math.max(10, Math.min(90, percent)));
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '420px',
                    borderRadius: '20px',
                    background: 'linear-gradient(180deg, #dcfce7 0%, #bbf7d0 60%, #86efac 100%)',
                    overflow: 'hidden',
                    cursor: isBambooPlaying ? 'ew-resize' : 'default',
                    userSelect: 'none',
                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.06)',
                    border: '2px solid #86efac'
                  }}
                >
                  {/* Decorative background clouds and bamboo stalks */}
                  <div style={{ position: 'absolute', top: '15px', left: '10%', fontSize: '32px', opacity: 0.35 }}>☁️</div>
                  <div style={{ position: 'absolute', top: '25px', right: '15%', fontSize: '38px', opacity: 0.35 }}>☁️</div>
                  <div style={{ position: 'absolute', bottom: '0', left: '4%', fontSize: '42px', opacity: 0.3 }}>🎍</div>
                  <div style={{ position: 'absolute', bottom: '0', right: '5%', fontSize: '42px', opacity: 0.3 }}>🎍</div>

                  {/* Falling Items */}
                  {isBambooPlaying &&
                    fallingItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          position: 'absolute',
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: '34px',
                          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))',
                          transition: 'top 0.05s linear'
                        }}
                      >
                        {item.emoji}
                      </div>
                    ))}

                  {/* Panda Basket Player */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${basketX}%`,
                      bottom: '24px',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      transition: 'left 0.08s ease-out'
                    }}
                  >
                    <div style={{ fontSize: '38px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>🐼</div>
                    <div
                      style={{
                        background: '#92400e',
                        color: '#fef3c7',
                        padding: '4px 14px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        marginTop: '-4px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                        border: '2px solid #d97706'
                      }}
                    >
                      🧺 Basket
                    </div>
                  </div>

                  {/* Overlay: Not logged in */}
                  {!isAuthenticated ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.88)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '24px'
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '20px',
                          background: '#fef3c7',
                          color: '#d97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '12px'
                        }}
                      >
                        <Lock size={32} />
                      </div>
                      <h4 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                        Panda Bamboo Catch is Locked 🎋
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', marginBottom: '18px' }}>
                        Sign in or register your child to catch falling bamboo treats and win Panda Points redeemable on toys!
                      </p>
                      <button
                        onClick={() => onRequireLogin && onRequireLogin()}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 28px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Unlock size={18} />
                        <span>Log In to Unlock &amp; Play</span>
                      </button>
                    </div>
                  ) : !isBambooPlaying && !bambooGameOver ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.86)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '20px'
                      }}
                    >
                      <div style={{ fontSize: '50px', marginBottom: '8px' }}>🎋🐼🧺</div>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                        Ready to Catch Bamboo?
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '18px' }}>
                        Catch falling bamboo (🎋), golden bamboo (🎍), apples (🍎), and stars (⭐) with the Panda Basket! Score 6+ to win real points!
                      </p>
                      <button
                        onClick={startBambooGame}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 32px',
                          borderRadius: '14px',
                          fontSize: '1.05rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Play size={18} fill="white" />
                        <span>Start Catching Now</span>
                      </button>
                    </div>
                  ) : bambooGameOver ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.92)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '20px'
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                        {bambooScore >= 12 ? '🏆🎉' : '👏🐼'}
                      </div>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                        Time's Up! You Caught {bambooScore} Treats!
                      </h4>
                      <p style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem', margin: '0 0 16px' }}>
                        {bambooScore >= 12
                          ? '🌟 Bamboo Master! +15 Panda Points Added!'
                          : bambooScore >= 6
                          ? 'Great job feeding the Panda! +10 Panda Points Added!'
                          : 'Nice try! Slide faster to catch more treats next round!'}
                      </p>
                      <button
                        onClick={startBambooGame}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 24px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RotateCcw size={16} />
                        <span>Play Again</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Kid-friendly left/right touch buttons for phone screens */}
                {isBambooPlaying && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px' }}>
                    <button
                      onClick={() => setBasketX((x) => Math.max(10, x - 15))}
                      style={{
                        flex: 1,
                        maxWidth: '180px',
                        padding: '12px',
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        fontWeight: '900',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(4, 120, 87, 0.3)'
                      }}
                    >
                      ⬅️ Move Left
                    </button>
                    <button
                      onClick={() => setBasketX((x) => Math.min(90, x + 15))}
                      style={{
                        flex: 1,
                        maxWidth: '180px',
                        padding: '12px',
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        fontWeight: '900',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(4, 120, 87, 0.3)'
                      }}
                    >
                      Move Right ➡️
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --- GAME 3: LUCKY TOY SPIN WHEEL --- */}
            {selectedGame === 'wheel' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '32px 24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'center'
                }}
              >
                <div style={{ maxWidth: '500px', margin: '0 auto 24px' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '900', margin: '0 0 6px' }}>
                    Lucky Toy Spin Wheel 🎡✨
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Spin the magical prize wheel every day to win instant Panda Points bonus coins!
                  </p>
                </div>

                {/* Spin Wheel Visual */}
                <div
                  style={{
                    position: 'relative',
                    width: '280px',
                    height: '280px',
                    margin: '0 auto 28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* Pointer Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '0',
                      height: '0',
                      borderLeft: '14px solid transparent',
                      borderRight: '14px solid transparent',
                      borderTop: '22px solid #dc2626',
                      zIndex: 10,
                      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.3))'
                    }}
                  />

                  {/* Rotating Wheel Circle */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '8px solid #fef3c7',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isSpinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'conic-gradient(#f59e0b 0deg 60deg, #10b981 60deg 120deg, #3b82f6 120deg 180deg, #8b5cf6 180deg 240deg, #ec4899 240deg 300deg, #059669 300deg 360deg)'
                    }}
                  >
                    {/* Wedge Labels */}
                    {WHEEL_PRIZES.map((prize, idx) => {
                      const angle = idx * 60 + 30;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            width: '50%',
                            height: '2px',
                            top: '50%',
                            left: '50%',
                            transformOrigin: '0% 50%',
                            transform: `rotate(${angle}deg)`,
                            pointerEvents: 'none'
                          }}
                        >
                          <div
                            style={{
                              marginLeft: '45px',
                              transform: 'rotate(90deg)',
                              color: '#ffffff',
                              fontWeight: '900',
                              fontSize: '0.85rem',
                              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {prize.emoji} {prize.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Panda Hub */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      zIndex: 5,
                      border: '4px solid #f59e0b'
                    }}
                  >
                    🐼
                  </div>
                </div>

                {/* Prize Banner */}
                {wheelPrize && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '16px',
                      padding: '14px 20px',
                      maxWidth: '380px',
                      margin: '0 auto 20px',
                      display: 'inline-block'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#047857' }}>
                      🎉 Congratulations! You Won {wheelPrize.label}!
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: '4px' }}>
                      Panda Points credited to your balance!
                    </div>
                  </div>
                )}

                {/* Spin Action Buttons */}
                <div>
                  {!isAuthenticated ? (
                    <button
                      onClick={() => onRequireLogin && onRequireLogin()}
                      style={{
                        background: '#f59e0b',
                        color: '#ffffff',
                        border: 'none',
                        padding: '14px 32px',
                        borderRadius: '14px',
                        fontWeight: '800',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      <Lock size={18} />
                      <span>Log In to Spin Wheel</span>
                    </button>
                  ) : hasSpunToday && !wheelPrize ? (
                    <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: '700' }}>
                      ⏱️ You already took your free spin today! Come back tomorrow for another lucky spin! 🐼
                    </div>
                  ) : (
                    <button
                      onClick={handleSpinWheel}
                      disabled={isSpinning || hasSpunToday}
                      style={{
                        background: hasSpunToday
                          ? '#cbd5e1'
                          : 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '14px 36px',
                        borderRadius: '14px',
                        fontWeight: '900',
                        fontSize: '1.05rem',
                        cursor: hasSpunToday || isSpinning ? 'not-allowed' : 'pointer',
                        boxShadow: hasSpunToday ? 'none' : '0 6px 18px rgba(236, 72, 153, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Sparkles size={20} />
                      <span>{isSpinning ? 'Spinning the Wheel...' : hasSpunToday ? 'Spun for Today' : 'SPIN THE WHEEL! 🎡'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* --- GAME 4: MEMORY CARD MATCH --- */}
            {selectedGame === 'memory' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '32px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: '0 0 6px' }}>
                    Panda Toy Memory Match 🎴
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Match all 6 pairs of toys and pandas to unlock <strong>+10 Panda Points</strong>!
                  </p>
                </div>

                {!isAuthenticated ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      background: 'radial-gradient(circle at 50% 50%, #f0fdf4 0%, #f8fafc 100%)',
                      borderRadius: '18px',
                      border: '1.5px dashed #cbd5e1'
                    }}
                  >
                    <Lock size={36} color="#d97706" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '800', marginBottom: '6px' }}>
                      Memory Game Locked for Guests
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 18px' }}>
                      Sign in or create your free account to unlock all memory card puzzles and accumulate Panda Points!
                    </p>
                    <button
                      onClick={() => onRequireLogin && onRequireLogin()}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontWeight: '700' }}
                    >
                      <Unlock size={16} />
                      <span>Log In to Play</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {memoryWon ? (
                      <div style={{ padding: '24px 20px', background: '#ecfdf5', borderRadius: '18px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                        <h4 style={{ color: '#047857', fontSize: '1.3rem', fontWeight: '800', margin: '0 0 4px' }}>
                          Super Memory! You Won +10 Panda Points!
                        </h4>
                        <p style={{ color: '#065f46', fontSize: '0.88rem', marginBottom: '14px' }}>
                          Points have been saved to your wallet. Ready for another round?
                        </p>
                        <button
                          onClick={initMemoryGame}
                          className="btn btn-primary"
                          style={{ padding: '10px 22px', borderRadius: '12px', fontWeight: '700' }}
                        >
                          <RotateCcw size={16} /> Play Again
                        </button>
                      </div>
                    ) : null}

                    {/* Cards Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '14px',
                        maxWidth: '480px',
                        margin: '0 auto 20px'
                      }}
                    >
                      {cards.map((card, idx) => {
                        const isCardFlipped = flipped.includes(idx) || matched.includes(idx);
                        return (
                          <div
                            key={card.id}
                            onClick={() => handleCardClick(idx)}
                            style={{
                              aspectRatio: '1/1',
                              background: isCardFlipped ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: `2px solid ${isCardFlipped ? '#10b981' : '#059669'}`,
                              borderRadius: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: isCardFlipped ? '2.4rem' : '1.4rem',
                              color: isCardFlipped ? '#0f172a' : '#ffffff',
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                              transition: 'transform 0.2s',
                              transform: isCardFlipped ? 'scale(1.03)' : 'scale(1)'
                            }}
                          >
                            {isCardFlipped ? card.icon : '🐼'}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={initMemoryGame}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RotateCcw size={14} /> Reset Cards
                    </button>
                  </>
                )}
              </div>
            )}

            {/* --- GAME 3: TOY RIDDLES & TRIVIA --- */}
            {selectedGame === 'trivia' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '32px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  textAlign: 'center'
                }}
              >
                <div style={{ marginBottom: '22px' }}>
                  <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: '0 0 6px' }}>
                    Toy Riddles &amp; Fun Quiz ❓
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Answer correctly to test your toy IQ and collect Panda Points!
                  </p>
                </div>

                {!isAuthenticated ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      background: 'radial-gradient(circle at 50% 50%, #eff6ff 0%, #f8fafc 100%)',
                      borderRadius: '18px',
                      border: '1.5px dashed #cbd5e1'
                    }}
                  >
                    <Lock size={36} color="#3b82f6" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '800', marginBottom: '6px' }}>
                      Toy Trivia Quiz Locked
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 18px' }}>
                      Please log in to participate in the quiz and save your points!
                    </p>
                    <button
                      onClick={() => onRequireLogin && onRequireLogin()}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontWeight: '700' }}
                    >
                      <Unlock size={16} />
                      <span>Log In to Unlock</span>
                    </button>
                  </div>
                ) : triviaWon ? (
                  <div style={{ padding: '30px 20px', background: '#ecfdf5', borderRadius: '18px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🌟</div>
                    <h4 style={{ color: '#047857', fontSize: '1.35rem', fontWeight: '800', margin: '0 0 6px' }}>
                      Quiz Completed! You scored {triviaScore}/{TRIVIA_QUESTIONS.length}!
                    </h4>
                    <p style={{ color: '#065f46', fontSize: '0.9rem', marginBottom: '18px' }}>
                      +10 Panda Points have been added to your profile balance!
                    </p>
                    <button
                      onClick={() => {
                        setTriviaIndex(0);
                        setTriviaScore(0);
                        setTriviaAnswered(false);
                        setSelectedOption(null);
                        setTriviaWon(false);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '10px 22px', borderRadius: '12px', fontWeight: '700' }}
                    >
                      <RotateCcw size={16} /> Retake Quiz
                    </button>
                  </div>
                ) : (
                  <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: '700', marginBottom: '12px' }}>
                      <span>Question {triviaIndex + 1} of {TRIVIA_QUESTIONS.length}</span>
                      <span>Score: {triviaScore}</span>
                    </div>

                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '24px 20px',
                        fontSize: '1.15rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        marginBottom: '20px',
                        lineHeight: 1.4
                      }}
                    >
                      "{TRIVIA_QUESTIONS[triviaIndex].question}"
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {TRIVIA_QUESTIONS[triviaIndex].options.map((opt, oIdx) => {
                        let optBg = '#ffffff';
                        let optBorder = '#e2e8f0';
                        let optColor = '#0f172a';

                        if (triviaAnswered) {
                          if (oIdx === TRIVIA_QUESTIONS[triviaIndex].correct) {
                            optBg = '#ecfdf5';
                            optBorder = '#10b981';
                            optColor = '#047857';
                          } else if (selectedOption === oIdx) {
                            optBg = '#fef2f2';
                            optBorder = '#ef4444';
                            optColor = '#991b1b';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={triviaAnswered}
                            onClick={() => handleTriviaAnswer(oIdx)}
                            style={{
                              padding: '14px 20px',
                              borderRadius: '14px',
                              border: `1.5px solid ${optBorder}`,
                              background: optBg,
                              color: optColor,
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              cursor: triviaAnswered ? 'default' : 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- GAME 4: TRUTH OR DARE SPINNER --- */}
            {selectedGame === 'truth-dare' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '32px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  textAlign: 'center'
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: '0 0 6px' }}>
                    Truth or Dare Family Game 🎲
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Spin fun questions &amp; cute challenges for kids and parents!
                  </p>
                </div>

                {!isAuthenticated ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      background: 'radial-gradient(circle at 50% 50%, #f5f3ff 0%, #f8fafc 100%)',
                      borderRadius: '18px',
                      border: '1.5px dashed #cbd5e1'
                    }}
                  >
                    <Lock size={36} color="#8b5cf6" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '800', marginBottom: '6px' }}>
                      Truth or Dare Locked
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 18px' }}>
                      Join Panda Nest to unlock unlimited family prompts and rewards.
                    </p>
                    <button
                      onClick={() => onRequireLogin && onRequireLogin()}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontWeight: '700' }}
                    >
                      <Unlock size={16} />
                      <span>Log In to Unlock</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <div
                      style={{
                        padding: '28px 24px',
                        borderRadius: '20px',
                        background: currentPrompt.type === 'truth' ? '#eff6ff' : '#fef3c7',
                        border: `2px solid ${currentPrompt.type === 'truth' ? '#93c5fd' : '#fcd34d'}`,
                        marginBottom: '20px'
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          background: '#ffffff',
                          color: currentPrompt.type === 'truth' ? '#1d4ed8' : '#b45309',
                          border: `1.5px solid ${currentPrompt.type === 'truth' ? '#bfdbfe' : '#fde68a'}`,
                          borderRadius: '9999px',
                          padding: '4px 14px',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          marginBottom: '10px'
                        }}
                      >
                        {currentPrompt.type === 'truth' ? '🔍 Truth Question' : '⚡ Fun Dare'}
                      </div>
                      <h4 style={{ fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.4, margin: '0 0 16px' }}>
                        "{currentPrompt.text}"
                      </h4>

                      {promptCompleted ? (
                        <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px' }}>
                          <span style={{ color: '#047857', fontWeight: '700', fontSize: '0.9rem' }}>
                            🎉 Challenge Done! +10 Panda Points Awarded!
                          </span>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setPromptCompleted(true);
                            awardPoints(10, 'Truth or Dare Challenge');
                          }}
                          style={{ padding: '10px 22px', fontWeight: '700' }}
                        >
                          I Completed It! (+10 PP)
                        </button>
                      )}
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const next = TRUTHS_AND_DARES[Math.floor(Math.random() * TRUTHS_AND_DARES.length)];
                        setCurrentPrompt(next);
                        setPromptCompleted(false);
                      }}
                      style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '700' }}
                    >
                      🎲 Spin Next Question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 2. TOY CARTOONS & REVIEWS ZONE --- */}
        {activeTab === 'videos' && (
          <div>
            {!isAuthenticated ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '48px 24px',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  marginBottom: '24px'
                }}
              >
                <Lock size={44} color="#f59e0b" style={{ margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
                  Toy Cartoon Video Club is Locked
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                  Watch curated panda cartoons and toy demonstrations with zero ads, and earn 10 Panda Points per video!
                </p>
                <button
                  onClick={() => onRequireLogin && onRequireLogin()}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: '800' }}
                >
                  <Unlock size={18} />
                  <span>Log In to Watch &amp; Earn</span>
                </button>
              </div>
            ) : (
              <div>
                {/* Active Video Player */}
                <div
                  style={{
                    background: 'linear-gradient(145deg, #064e3b 0%, #022c22 100%)',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '24px',
                    padding: '24px',
                    color: '#ffffff',
                    boxShadow: '0 20px 40px -10px rgba(6, 78, 59, 0.4)',
                    marginBottom: '28px'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '56.25%',
                      height: 0,
                      overflow: 'hidden',
                      borderRadius: '16px',
                      background: '#000000',
                      marginBottom: '18px'
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
                        borderRadius: '16px'
                      }}
                      src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=0&rel=0`}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 4px', fontWeight: '800' }}>
                        {activeVideo.title}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{activeVideo.channel}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {videoCompleted ? (
                        <div
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '9999px',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>Reward Claimed (+10 PP)</span>
                        </div>
                      ) : watching ? (
                        <div
                          style={{
                            background: '#d97706',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '9999px',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Clock size={16} />
                          <span>Watch {watchTimer}s to get +10 PP!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => startWatchingVideo(activeVideo)}
                          className="btn btn-primary"
                          style={{
                            padding: '10px 22px',
                            borderRadius: '9999px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Play size={16} fill="white" />
                          <span>Watch &amp; Earn 10 PP</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Categories Filter Bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>
                      Browse Videos by Category 🎬
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Watch 30s of any video to earn <strong>+10 Panda Points</strong>!
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {['All', 'Cartoons', 'RC & Action', 'Pretend Play', 'Outdoor & Summer', 'STEM & Learning', 'Musical & Plush'].map((cat) => {
                      const isCatSelected = selectedVideoCategory === cat;
                      const count = cat === 'All' ? videoList.length : videoList.filter(v => (v.category || 'Cartoons') === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedVideoCategory(cat)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid',
                            borderColor: isCatSelected ? '#10b981' : '#e2e8f0',
                            background: isCatSelected ? '#ecfdf5' : '#ffffff',
                            color: isCatSelected ? '#047857' : '#475569',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            boxShadow: isCatSelected ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{cat}</span>
                          <span
                            style={{
                              background: isCatSelected ? '#10b981' : '#f1f5f9',
                              color: isCatSelected ? '#ffffff' : '#64748b',
                              padding: '2px 7px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: '700'
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Video Selection Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px' }}>
                  {videoList
                    .filter((vid) => selectedVideoCategory === 'All' || (vid.category || 'Cartoons') === selectedVideoCategory)
                    .map((vid) => {
                      const isSelected = activeVideo.id === vid.id;
                      const isClaimed = completedVideos.includes(vid.id);

                      return (
                        <div
                          key={vid.id}
                          onClick={() => {
                            setActiveVideo(vid);
                            setVideoCompleted(isClaimed);
                            setWatching(false);
                          }}
                          style={{
                            background: '#ffffff',
                            borderRadius: '18px',
                            border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                            padding: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 8px 20px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                              }}
                            >
                              🏷️ {vid.category || 'Cartoons'}
                            </span>

                            <span
                              style={{
                                background: isClaimed ? '#ecfdf5' : '#fef3c7',
                                color: isClaimed ? '#047857' : '#b45309',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}
                            >
                              {isClaimed ? '✓ 10 PP Claimed' : '🎁 +10 PP Reward'}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 6px', fontWeight: '800', lineHeight: 1.3 }}>
                            {vid.title}
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px', lineHeight: 1.4 }}>
                            {vid.description}
                          </p>

                          <button
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ width: '100%', justifyContent: 'center', fontWeight: '800' }}
                          >
                            {isSelected ? '▶️ Currently Playing' : 'Watch Video'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default GamesAndActivities;
