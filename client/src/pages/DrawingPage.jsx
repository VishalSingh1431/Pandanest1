import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Download, RotateCcw, Palette, Sparkles, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'
];

const BRUSH_SIZES = [4, 8, 14, 24];

export function DrawingPage({ onNavigate }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [featuredToys, setFeaturedToys] = useState([]);
  const { addToCart, openBuyNow } = useCart();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 800;
    canvas.height = 480;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fetch('/api/toys?featured=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeaturedToys(data.slice(0, 4));
      })
      .catch(err => console.error('Failed fetching toys for drawing page', err));
  }, []);

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
    ctx.lineWidth = brushSize;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadArt = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `pandanest-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => onNavigate ? onNavigate('games') : window.history.back()}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Panda Club
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-amber" style={{ fontSize: '0.82rem' }}>
            🎨 Little Artist Studio
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: '800', marginBottom: '6px' }}>
          Panda Magic Canvas &amp; Drawing 🐼✨
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Draw, color, and save your masterpiece!
        </p>
      </div>

      {/* Canvas Toolbars */}
      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          {/* Colors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Colors:</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setCurrentColor(c); setIsEraser(false); }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c,
                  border: currentColor === c && !isEraser ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  transform: currentColor === c && !isEraser ? 'scale(1.15)' : 'none',
                  transition: 'transform 0.1s ease'
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setIsEraser(!isEraser)}
              className="btn btn-secondary btn-sm"
              style={{
                marginLeft: '8px',
                background: isEraser ? '#fee2e2' : '#ffffff',
                borderColor: isEraser ? '#ef4444' : '#cbd5e1',
                color: isEraser ? '#b91c1c' : '#334155',
                fontWeight: '700'
              }}
            >
              🧹 Eraser
            </button>
          </div>

          {/* Brush Sizes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Size:</span>
            {BRUSH_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: brushSize === sz ? '#059669' : '#ffffff',
                  color: brushSize === sz ? '#ffffff' : '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={clearCanvas}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={15} /> Clear
            </button>
            <button
              type="button"
              onClick={downloadArt}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={15} /> Save Art
            </button>
          </div>
        </div>
      </div>

      {/* The HTML5 Canvas */}
      <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{ width: '100%', height: '480px', display: 'block', cursor: isEraser ? 'cell' : 'crosshair', touchAction: 'none' }}
        />
      </div>

      {/* Buy Now Recommended Toys Tray (Item 7 Requirement) */}
      <div style={{ marginTop: '48px', borderTop: '2px dashed #e2e8f0', paddingTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>
              🎨 Creative Play &amp; Toys
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
              Toys to Inspire Little Creatives 🚀
            </h2>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate('catalog') : null}
            className="btn btn-secondary btn-sm"
          >
            View All Toys →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {featuredToys.map(toy => (
            <div
              key={toy.id}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}
            >
              <img
                src={toy.image_url}
                alt={toy.name}
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }}
              />
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                {toy.name}
              </h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#047857' }}>
                  ₹{Number(toy.price).toLocaleString('en-IN')}
                </span>
                {toy.original_price && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    ₹{Number(toy.original_price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => addToCart(toy)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 4px', fontSize: '0.8rem', fontWeight: '700' }}
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => openBuyNow(toy)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 4px', fontSize: '0.8rem', fontWeight: '800' }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default DrawingPage;
