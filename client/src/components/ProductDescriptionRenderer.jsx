import React from 'react';
import { Check, Package, Sparkles } from 'lucide-react';

/**
 * Parses raw product descriptions (including markdown, bullet points, emojis,
 * and combo text) into a beautifully formatted, highly readable layout.
 */
export function ProductDescriptionRenderer({ description, toyName, ageGroup, category }) {
  if (!description || typeof description !== 'string') {
    return (
      <p style={{ fontSize: '0.96rem', color: '#64748b', lineHeight: 1.7 }}>
        Crafted with certified child-safe materials designed to inspire sensory development, coordination, and imaginative play.
      </p>
    );
  }

  // Pre-process raw text to normalize newlines and section boundaries
  let text = description.trim();

  // If text was pasted as a single massive line with emojis or ** headers without newlines,
  // insert newlines before prominent emojis or ** markers to cleanly split them.
  text = text.replace(/([.!?])\s*([🚜🚧🌾🎮📦💡✨🌟⭐])\s*/g, '$1\n\n$2 ');
  text = text.replace(/([.!?])\s*(\*\*[A-Z0-9\s&—!/:]{4,}\*\*)/g, '$1\n\n$2');
  text = text.replace(/([.!?])\s*(FUN PRETEND PLAY|A FUN GIFT|Product Includes)/gi, '$1\n\n**$2**');

  // Split into raw paragraph blocks
  const rawBlocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  // Group into: introductory text, feature cards, "what's in the box", and conclusion
  const introParagraphs = [];
  const featureCards = [];
  const whatsInTheBox = [];
  const outroParagraphs = [];

  let inIncludesSection = false;

  for (const block of rawBlocks) {
    // Check if this block is "Product Includes" or "What's in the Box"
    if (/product includes|what['’]s in the box|package includes|in the box/i.test(block)) {
      inIncludesSection = true;
      // Extract bullet lines from this block
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^[-•*]\s*(.+)/.test(line)) {
          whatsInTheBox.push(line.replace(/^[-•*]\s*/, ''));
        } else if (!/product includes|what['’]s in the box|package includes/i.test(line)) {
          const cleaned = line.replace(/^\*+|\*+$/g, '').trim();
          if (cleaned) whatsInTheBox.push(cleaned);
        }
      }
      continue;
    }

    if (inIncludesSection) {
      // Check if lines are bullet items
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const isAllBullets = lines.every(l => /^[-•*]/.test(l));
      if (isAllBullets) {
        lines.forEach(l => whatsInTheBox.push(l.replace(/^[-•*]\s*/, '')));
        continue;
      } else {
        inIncludesSection = false;
        outroParagraphs.push(block);
        continue;
      }
    }

    // Check if this block has a prominent header (e.g. 🚜 **TITLE** Description or **TITLE** Description)
    const headerMatch = block.match(/^([🚜🚧🌾🎮📦💡✨🌟⭐]\s*)?(?:\*\*(.+?)\*\*|([A-Z0-9\s&—!]{6,}))(?:\s*[:\-–]\s*|\s+)([\s\S]+)$/);

    if (headerMatch) {
      const emoji = (headerMatch[1] || '').trim();
      const rawTitle = (headerMatch[2] || headerMatch[3] || '').trim().replace(/^\*+|\*+$/g, '');
      const body = (headerMatch[4] || '').trim();

      if (rawTitle.length >= 3 && body.length >= 10) {
        featureCards.push({
          emoji: emoji || '✨',
          title: rawTitle,
          body: body
        });
        continue;
      }
    }

    // If no features yet, it's intro
    if (featureCards.length === 0) {
      introParagraphs.push(block);
    } else {
      outroParagraphs.push(block);
    }
  }

  // Helper to render bold spans cleanly
  const renderFormattedText = (rawStr) => {
    const parts = rawStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Intro lead paragraphs */}
      {introParagraphs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {introParagraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                fontSize: idx === 0 ? '1.05rem' : '0.98rem',
                color: idx === 0 ? '#1e293b' : '#475569',
                lineHeight: 1.7,
                margin: 0,
                fontWeight: idx === 0 ? '500' : '400'
              }}
            >
              {renderFormattedText(para)}
            </p>
          ))}
        </div>
      )}

      {/* Structured Feature Highlight Cards Grid */}
      {featureCards.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Sparkles size={18} color="#059669" />
            Key Highlights & Features
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px'
            }}
          >
            {featureCards.map((feat, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{feat.emoji}</span>
                  <h4
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      margin: 0,
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {feat.title}
                  </h4>
                </div>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: '#475569',
                    lineHeight: 1.6,
                    margin: 0
                  }}
                >
                  {renderFormattedText(feat.body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "What's Included in the Box" Highlight Box */}
      {whatsInTheBox.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid #a7f3d0',
            borderRadius: '16px',
            padding: '20px 22px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Package size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#065f46', margin: 0 }}>
                Package Includes
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#047857' }}>
                Everything included right out of the box
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {whatsInTheBox.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  border: '1px solid #d1fae5'
                }}
              >
                <Check size={16} color="#059669" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outro conclusion paragraphs */}
      {outroParagraphs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          {outroParagraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                fontSize: '0.94rem',
                color: '#334155',
                lineHeight: 1.65,
                margin: 0,
                fontWeight: '500'
              }}
            >
              {renderFormattedText(para)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
