import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RefreshCw, Award, ArrowRight, Smile, Zap, Heart } from 'lucide-react';

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

export function TruthOrDare({ onGoToCatalog }) {
  const [mode, setMode] = useState(null); // 'truth' or 'dare'
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [pointsEarned, setPointsEarned] = useState(() => {
    return parseInt(localStorage.getItem('pandanest_panda_points') || '100', 10);
  });
  const [completedCount, setCompletedCount] = useState(0);

  const pickRandom = (type) => {
    setMode(type);
    const list = type === 'truth' ? TRUTH_PROMPTS : DARE_PROMPTS;
    const randomItem = list[Math.floor(Math.random() * list.length)];
    setCurrentPrompt(randomItem);
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
    setMode(null);
  };

  return (
    <div style={{ minHeight: '85vh', background: 'radial-gradient(circle at 50% 10%, #ecfdf5 0%, #ffffff 80%)', padding: '40px 16px' }}>
      <div className="container" style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div className="badge badge-amber" style={{ marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}>
            <Sparkles size={14} /> Panda Club Activities & Games
          </div>
          <h1 style={{ fontSize: '2.4rem', color: '#0f172a', marginBottom: '8px' }}>
            Panda Truth or Dare! 🐼🎲
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.5 }}>
            Play together as a family! Complete silly challenges, share laughter, and earn <strong>+10 Panda Points</strong> each round!
          </p>

          {/* Points Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fef3c7',
              border: '1.5px solid #f59e0b',
              padding: '8px 18px',
              borderRadius: '20px',
              marginTop: '14px',
              fontWeight: '700',
              color: '#92400e'
            }}
          >
            <Award size={18} color="#d97706" />
            <span>Your Panda Points: {pointsEarned} Points</span>
          </div>
        </div>

        {/* Card Screen */}
        <div
          style={{
            background: 'white',
            borderRadius: '28px',
            border: '2px solid #a7f3d0',
            boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.15)',
            padding: '36px 28px',
            position: 'relative',
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {!mode ? (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '16px' }} className="animate-float">
                🎪
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '10px' }}>
                Pick Your Challenge!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
                Are you ready for a fun question or an active silly dare?
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '380px', margin: '0 auto' }}>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)', padding: '16px 24px' }}
                  onClick={() => pickRandom('truth')}
                >
                  <Smile size={20} />
                  <span>TRUTH 💭</span>
                </button>

                <button
                  className="btn btn-accent btn-lg"
                  style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', padding: '16px 24px' }}
                  onClick={() => pickRandom('dare')}
                >
                  <Zap size={20} />
                  <span>DARE ⚡</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <span
                className={`badge ${mode === 'truth' ? 'badge-blue' : 'badge-pink'}`}
                style={{ fontSize: '0.9rem', padding: '6px 16px', marginBottom: '16px' }}
              >
                {mode === 'truth' ? '💭 TRUTH TIME' : '⚡ DARE CHALLENGE'}
              </span>

              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  lineHeight: 1.45,
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '20px',
                  border: '1.5px dashed #cbd5e1',
                  margin: '16px 0 24px'
                }}
              >
                "{currentPrompt}"
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontSize: '1rem' }}
                  onClick={handleChallengeComplete}
                >
                  <Award size={18} />
                  <span>Challenge Done! (+10 Points 🎉)</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '12px 20px' }}
                  onClick={() => pickRandom(mode)}
                >
                  <RefreshCw size={16} />
                  <span>Next {mode === 'truth' ? 'Truth' : 'Dare'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: '28px' }}>
          <button
            className="btn btn-secondary"
            onClick={onGoToCatalog}
            style={{ padding: '12px 24px' }}
          >
            <span>Back to Toy Catalog</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
