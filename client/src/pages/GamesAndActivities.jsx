import React, { useState, useEffect } from 'react';
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
  ShoppingBag
} from 'lucide-react';

// YouTube Videos curated for kids & toys
const TOY_VIDEOS = [
  {
    id: 'V1',
    youtubeId: '3vTfq_724jM',
    title: 'Baby Panda Cute Cartoon Adventures 🐼',
    channel: 'Panda Nest Kids Club',
    durationSec: 40,
    description: 'Join the playful little panda cub as he explores the bamboo forest and builds colorful wooden toy nests with friends.'
  },
  {
    id: 'V2',
    youtubeId: 'u7r6q69P0rQ',
    title: 'High Speed RC Stunt Cars & Monster Truck Showcase 🏎️',
    channel: 'Toy Arena',
    durationSec: 40,
    description: 'Watch incredible 360-degree tumbling spins, off-road ramp jumps, and glow-in-the-dark stunt drifting in action!'
  },
  {
    id: 'V3',
    youtubeId: 'Y9j4LhD1w30',
    title: 'Magical Dollhouse Castle & Princess Fairytale Play 🏰',
    channel: 'Creative Playroom',
    durationSec: 40,
    description: 'Step into the enchanted miniature fairytale castle with light-up balconies, miniature royal tea sets, and magical storytelling.'
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

export function GamesAndActivities({ onGoToCatalog }) {
  const [activeTab, setActiveTab] = useState('games'); // 'games' | 'videos'
  const [selectedGame, setSelectedGame] = useState('memory'); // 'memory' | 'truth-dare' | 'trivia'
  const [points, setPoints] = useState(() => parseInt(localStorage.getItem('pandanest_panda_points') || '100', 10));

  // Memory Game state
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [memoryWon, setMemoryWon] = useState(false);

  // Trivia state
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [triviaWon, setTriviaWon] = useState(false);

  // Truth or Dare state
  const [currentPrompt, setCurrentPrompt] = useState(TRUTHS_AND_DARES[0]);
  const [promptCompleted, setPromptCompleted] = useState(false);

  // Video State
  const [activeVideo, setActiveVideo] = useState(TOY_VIDEOS[0]);
  const [watching, setWatching] = useState(false);
  const [watchTimer, setWatchTimer] = useState(40);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [completedVideos, setCompletedVideos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pandanest_watched_videos') || '[]');
    } catch {
      return [];
    }
  });

  // Award Panda Points Helper
  const awardPoints = (amount = 10, reason = 'Game Completed') => {
    const newPoints = points + amount;
    setPoints(newPoints);
    localStorage.setItem('pandanest_panda_points', String(newPoints));

    // Confetti celebration
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Initialize Memory Game
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

  // Handle Memory Card Click
  const handleCardClick = (index) => {
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
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  // Video Watch Timer
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

  // Start watching video
  const startWatchingVideo = (video) => {
    setActiveVideo(video);
    setVideoCompleted(completedVideos.includes(video.id));
    setWatchTimer(video.durationSec);
    setWatching(true);
  };

  // Handle Trivia Answer
  const handleTriviaAnswer = (optIndex) => {
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
    }, 1200);
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '88vh', padding: '36px 0 60px' }}>
      <div className="container" style={{ maxWidth: '1060px' }}>

        {/* Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '24px',
            padding: '36px 32px',
            color: '#ffffff',
            boxShadow: '0 16px 36px -10px rgba(245, 158, 11, 0.35)',
            marginBottom: '32px',
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
              <Sparkles size={14} /> Panda Play & Earn Zone
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', margin: '0 0 8px', lineHeight: 1.15 }}>
              Games & Fun Activities 🎮🎬
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.95, maxWidth: '520px', lineHeight: 1.5 }}>
              Play fun mini-games or watch toy videos with family! Complete any activity to earn <strong>+10 Panda Points</strong>.
            </p>
          </div>

          {/* Points Pill */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '18px 24px',
              color: '#0f172a',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              textAlign: 'center',
              minWidth: '150px'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Your Balance
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Award size={24} color="#d97706" />
              <span>{points} pts</span>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
          <button
            onClick={() => setActiveTab('games')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'games' ? '#f59e0b' : '#ffffff',
              color: activeTab === 'games' ? '#ffffff' : '#0f172a',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'games' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s'
            }}
          >
            <Gamepad2 size={18} />
            <span>Interactive Mini Games (+10 PP)</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'videos' ? '#f59e0b' : '#ffffff',
              color: activeTab === 'videos' ? '#ffffff' : '#0f172a',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'videos' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s'
            }}
          >
            <Tv size={18} />
            <span>Toy Videos (+10 PP)</span>
          </button>
        </div>

        {/* 1. INTERACTIVE MINI GAMES */}
        {activeTab === 'games' && (
          <div>
            {/* Sub-game switcher pills */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
              <button
                onClick={() => setSelectedGame('memory')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'memory' ? '#10b981' : '#e2e8f0',
                  background: selectedGame === 'memory' ? '#ecfdf5' : '#ffffff',
                  color: selectedGame === 'memory' ? '#047857' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🎴 Panda Card Match
              </button>

              <button
                onClick={() => setSelectedGame('trivia')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'trivia' ? '#10b981' : '#e2e8f0',
                  background: selectedGame === 'trivia' ? '#ecfdf5' : '#ffffff',
                  color: selectedGame === 'trivia' ? '#047857' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                ❓ Toy Riddles & Trivia
              </button>

              <button
                onClick={() => setSelectedGame('truth-dare')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedGame === 'truth-dare' ? '#10b981' : '#e2e8f0',
                  background: selectedGame === 'truth-dare' ? '#ecfdf5' : '#ffffff',
                  color: selectedGame === 'truth-dare' ? '#047857' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🎲 Truth or Dare Family Game
              </button>
            </div>

            {/* Game 1: Panda Memory Match */}
            {selectedGame === 'memory' && (
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
                    Panda Toy Memory Match 🎴
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Match all 6 pairs of toys and pandas to unlock <strong>+10 Panda Points</strong>!
                  </p>
                </div>

                {memoryWon ? (
                  <div style={{ padding: '30px 20px', background: '#ecfdf5', borderRadius: '18px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                    <h3 style={{ color: '#047857', fontSize: '1.4rem', marginBottom: '6px' }}>
                      Super Memory! You Won +10 Panda Points!
                    </h3>
                    <p style={{ color: '#065f46', fontSize: '0.9rem', marginBottom: '16px' }}>
                      Your points have been credited to your rewards wallet.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={initMemoryGame}
                    >
                      <RotateCcw size={16} /> Play Again
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      maxWidth: '460px',
                      margin: '0 auto 24px'
                    }}
                  >
                    {cards.map((card, idx) => {
                      const isRevealed = flipped.includes(idx) || matched.includes(idx);
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(idx)}
                          style={{
                            height: '90px',
                            borderRadius: '16px',
                            border: `2px solid ${isRevealed ? '#10b981' : '#e2e8f0'}`,
                            background: isRevealed ? '#f0fdf4' : '#ffffff',
                            fontSize: isRevealed ? '38px' : '24px',
                            cursor: isRevealed ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s transform'
                          }}
                        >
                          {isRevealed ? card.icon : '❓'}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={initMemoryGame}
                    className="btn btn-secondary btn-sm"
                  >
                    <RotateCcw size={15} /> Reset Deck
                  </button>
                </div>
              </div>
            )}

            {/* Game 2: Toy Riddles & Trivia */}
            {selectedGame === 'trivia' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '32px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                  <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: '800', margin: '0 0 6px' }}>
                    Toy Detective Riddle Quiz ❓
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Question {triviaIndex + 1} of {TRIVIA_QUESTIONS.length}
                  </span>
                </div>

                {triviaWon ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: '#ecfdf5', borderRadius: '16px' }}>
                    <div style={{ fontSize: '42px', marginBottom: '10px' }}>🌟</div>
                    <h3 style={{ color: '#047857', marginBottom: '6px' }}>Quiz Completed!</h3>
                    <p style={{ color: '#065f46', fontSize: '0.9rem', marginBottom: '16px' }}>
                      You scored {triviaScore}/{TRIVIA_QUESTIONS.length}! You earned <strong>+10 Panda Points</strong>!
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setTriviaIndex(0);
                        setTriviaScore(0);
                        setTriviaWon(false);
                        setTriviaAnswered(false);
                        setSelectedOption(null);
                      }}
                    >
                      <RotateCcw size={16} /> Play Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ fontSize: '1.1rem', color: '#0f172a', lineHeight: 1.4, marginBottom: '20px' }}>
                      {TRIVIA_QUESTIONS[triviaIndex].question}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {TRIVIA_QUESTIONS[triviaIndex].options.map((opt, idx) => {
                        const isChosen = selectedOption === idx;
                        const isCorrect = idx === TRIVIA_QUESTIONS[triviaIndex].correct;
                        let btnBg = '#ffffff';
                        let btnBorder = '#e2e8f0';

                        if (triviaAnswered) {
                          if (isCorrect) {
                            btnBg = '#ecfdf5';
                            btnBorder = '#10b981';
                          } else if (isChosen) {
                            btnBg = '#fef2f2';
                            btnBorder = '#ef4444';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleTriviaAnswer(idx)}
                            style={{
                              padding: '14px 18px',
                              borderRadius: '14px',
                              border: `2px solid ${btnBorder}`,
                              background: btnBg,
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: '#0f172a',
                              textAlign: 'left',
                              cursor: triviaAnswered ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                            }}
                          >
                            <span>{opt}</span>
                            {triviaAnswered && isCorrect && <CheckCircle2 size={18} color="#059669" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Game 3: Truth or Dare */}
            {selectedGame === 'truth-dare' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  padding: '36px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  textAlign: 'center',
                  maxWidth: '560px',
                  margin: '0 auto'
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      background: currentPrompt.type === 'truth' ? '#eff6ff' : '#fef3c7',
                      color: currentPrompt.type === 'truth' ? '#1d4ed8' : '#b45309',
                      border: `1.5px solid ${currentPrompt.type === 'truth' ? '#bfdbfe' : '#fde68a'}`,
                      borderRadius: '9999px',
                      padding: '4px 14px',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      marginBottom: '10px'
                    }}
                  >
                    {currentPrompt.type === 'truth' ? '🔍 Truth Question' : '⚡ Fun Dare'}
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: '#0f172a', lineHeight: 1.4 }}>
                    "{currentPrompt.text}"
                  </h3>
                </div>

                {promptCompleted ? (
                  <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '14px', marginBottom: '16px' }}>
                    <span style={{ color: '#047857', fontWeight: '700' }}>
                      🎉 Challenge Done! +10 Panda Points Awarded!
                    </span>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setPromptCompleted(true);
                      awardPoints(10, 'Truth or Dare Completed');
                    }}
                    style={{ padding: '12px 28px', fontWeight: '700', marginBottom: '14px' }}
                  >
                    I Completed It! (Claim +10 PP)
                  </button>
                )}

                <div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const next = TRUTHS_AND_DARES[Math.floor(Math.random() * TRUTHS_AND_DARES.length)];
                      setCurrentPrompt(next);
                      setPromptCompleted(false);
                    }}
                  >
                    🎲 Spin Next Prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. YOUTUBE VIDEO ZONE */}
        {activeTab === 'videos' && (
          <div>
            {/* Active Cinema Video Player */}
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
              {/* Responsive Video Container */}
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%', // 16:9 Aspect Ratio
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

              {/* Video Info and Reward Progress Strip */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 4px', fontWeight: '800' }}>
                    {activeVideo.title}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{activeVideo.channel}</span>
                </div>

                {/* Watch-to-Earn Mechanism */}
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
                      <Clock size={16} className="animate-spin" />
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
                      <span>Watch & Earn 10 PP</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Video List Selector */}
            <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', marginBottom: '14px' }}>
              Select More Toy Videos to Watch:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
              {TOY_VIDEOS.map((vid) => {
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
                      border: `2px solid ${isSelected ? '#f59e0b' : '#e2e8f0'}`,
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
                        {isClaimed ? '✓ 10 PP Claimed' : '🎁 Watch to Earn 10 PP'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 6px', fontWeight: '700', lineHeight: 1.3 }}>
                      {vid.title}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {vid.description}
                    </p>

                    <button
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {isSelected ? 'Currently Watching' : 'Play Video'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export default GamesAndActivities;
