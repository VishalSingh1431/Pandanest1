import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  PaintBucket,
  Pencil,
  Eraser,
  Undo2,
  Printer,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';

const TOTAL_BOOK_PAGES = 118;
const PAGES_PER_GROUP = 12;

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207'
];

const BRUSH_SIZES = [4, 8, 16, 26];

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function DrawingPage({ onNavigate }) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const templateBoundsRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const historyRef = useRef([]);
  const lastCoordRef = useRef({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('fill'); // 'brush' | 'fill' | 'eraser'
  const [currentColor, setCurrentColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(8);

  // Drawing book template state
  const [selectedPage, setSelectedPage] = useState(1); // null = blank, number = built-in 1..118, string = custom url
  const [pageGroup, setPageGroup] = useState(0); // 0..9 (12 thumbnails per group)
  const [showBookDrawer, setShowBookDrawer] = useState(true);
  const [customPages, setCustomPages] = useState([]);
  const [featuredToys, setFeaturedToys] = useState([]);
  const { addToCart, openBuyNow } = useCart();

  const saveHistorySnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [...historyRef.current.slice(-14), snap];
    } catch {
      // ignore
    }
  };

  const loadTemplateToCanvas = (pageNum) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Initialize or resize offscreen base canvas
    if (!baseCanvasRef.current) {
      baseCanvasRef.current = document.createElement('canvas');
    }
    const baseCanvas = baseCanvasRef.current;
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });

    // Fill white on both
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    baseCtx.fillStyle = '#ffffff';
    baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

    if (!pageNum) {
      templateBoundsRef.current = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      historyRef.current = [];
      saveHistorySnapshot();
      return;
    }

    let imgSrc = '';
    if (typeof pageNum === 'string' && (pageNum.startsWith('http') || pageNum.startsWith('/'))) {
      imgSrc = pageNum;
    } else {
      const padded = String(pageNum).padStart(3, '0');
      imgSrc = `/drawing-book/page-${padded}.jpg`;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgSrc;
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      baseCtx.fillStyle = '#ffffff';
      baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const drawW = Math.floor(img.width * scale);
      const drawH = Math.floor(img.height * scale);
      const offsetX = Math.floor((canvas.width - drawW) / 2);
      const offsetY = Math.floor((canvas.height - drawH) / 2);

      templateBoundsRef.current = { x: offsetX, y: offsetY, w: drawW, h: drawH };

      // Draw onto both the visible canvas and the offscreen base canvas
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      baseCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Draw subtle boundary frame so floodFill never leaks outside the coloring sheet
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX, offsetY, drawW, drawH);

      baseCtx.strokeStyle = '#334155';
      baseCtx.lineWidth = 2;
      baseCtx.strokeRect(offsetX, offsetY, drawW, drawH);

      historyRef.current = [];
      saveHistorySnapshot();
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parentW = canvas.parentElement?.clientWidth || 860;
    canvas.width = Math.min(960, Math.max(320, parentW));
    canvas.height = 560;
    loadTemplateToCanvas(1);

    fetch('/api/toys?featured=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeaturedToys(data.slice(0, 4));
      })
      .catch(err => console.error('Failed fetching toys for drawing page', err));

    fetch('/api/videos/drawing-pages')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setCustomPages(data);
      })
      .catch(() => {});
  }, []);

  const handleSelectPage = (pageNum) => {
    setSelectedPage(pageNum);
    loadTemplateToCanvas(pageNum);
  };

  const handlePrevPage = () => {
    const cur = typeof selectedPage === 'number' ? selectedPage : 1;
    const next = cur <= 1 ? TOTAL_BOOK_PAGES : cur - 1;
    handleSelectPage(next);
  };

  const handleNextPage = () => {
    const cur = typeof selectedPage === 'number' ? selectedPage : 1;
    const next = cur >= TOTAL_BOOK_PAGES ? 1 : cur + 1;
    handleSelectPage(next);
  };

  const handleBuyFullBookPdf = () => {
    openBuyNow({
      id: 'drawing-book-118-pdf',
      name: 'Panda Nest 118-Page Jumbo Activity & Coloring Book (PDF Download)',
      price: 9,
      original_price: 99,
      image_url: '/drawing-book/page-001.jpg',
      description: '118 High-Resolution Printable Animals, Vehicles, Dinosaurs & Fantasy coloring pages. Instant download upon checkout.'
    });
  };

  // Boundary-aware Flood Fill for Bucket Tool
  const floodFill = (startX, startY, fillHex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const bounds = templateBoundsRef.current;

    const minX = bounds?.w > 0 ? bounds.x : 0;
    const maxX = bounds?.w > 0 ? bounds.x + bounds.w : canvas.width;
    const minY = bounds?.h > 0 ? bounds.y : 0;
    const maxY = bounds?.h > 0 ? bounds.y + bounds.h : canvas.height;

    const x0 = Math.floor(startX);
    const y0 = Math.floor(startY);
    // Ignore clicks outside the coloring book page frame
    if (x0 < minX || x0 >= maxX || y0 < minY || y0 >= maxY) return;

    saveHistorySnapshot();

    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const startIdx = (y0 * w + x0) * 4;
    const sr = data[startIdx];
    const sg = data[startIdx + 1];
    const sb = data[startIdx + 2];

    const [fr, fg, fb] = hexToRgb(fillHex);
    if (Math.abs(sr - fr) < 6 && Math.abs(sg - fg) < 6 && Math.abs(sb - fb) < 6) return;

    // Luminance barrier: Don't fill dark outline strokes (luminance < 135)
    const startLuminance = sr * 0.299 + sg * 0.587 + sb * 0.114;
    if (startLuminance < 135) return;

    const tolerance = 32;
    const visited = new Uint8Array(w * h);
    const stack = [x0, y0];

    const matchesStart = (pos) => {
      const idx = pos * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Outline barrier check: Stop at any dark line
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      if (lum < 135) return false;

      return (
        Math.abs(r - sr) <= tolerance &&
        Math.abs(g - sg) <= tolerance &&
        Math.abs(b - sb) <= tolerance
      );
    };

    while (stack.length > 0) {
      const y = stack.pop();
      const x = stack.pop();
      let curX = x;

      while (curX >= minX && !visited[y * w + curX] && matchesStart(y * w + curX)) {
        curX--;
      }
      curX++;

      let spanAbove = false;
      let spanBelow = false;

      while (curX < maxX && !visited[y * w + curX] && matchesStart(y * w + curX)) {
        const p = y * w + curX;
        visited[p] = 1;
        const idx = p * 4;
        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = 255;

        if (y > minY) {
          const aboveMatch = !visited[(y - 1) * w + curX] && matchesStart((y - 1) * w + curX);
          if (!spanAbove && aboveMatch) {
            stack.push(curX, y - 1);
            spanAbove = true;
          } else if (spanAbove && !aboveMatch) {
            spanAbove = false;
          }
        }

        if (y < maxY - 1) {
          const belowMatch = !visited[(y + 1) * w + curX] && matchesStart((y + 1) * w + curX);
          if (!spanBelow && belowMatch) {
            stack.push(curX, y + 1);
            spanBelow = true;
          } else if (spanBelow && !belowMatch) {
            spanBelow = false;
          }
        }
        curX++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Erases user paint without deleting the original base template line art
  const eraseAlongStroke = (x1, y1, x2, y2) => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const r = Math.max(8, brushSize * 1.5);
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 3));

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.clip();
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.restore();
  };

  const startDraw = (e) => {
    const { x, y } = getCanvasCoords(e);
    lastCoordRef.current = { x, y };

    if (tool === 'fill') {
      floodFill(x, y, currentColor);
      return;
    }

    saveHistorySnapshot();
    setIsDrawing(true);

    if (tool === 'eraser') {
      eraseAlongStroke(x, y, x, y);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
  };

  const draw = (e) => {
    if (!isDrawing || tool === 'fill') return;
    const { x, y } = getCanvasCoords(e);
    const prev = lastCoordRef.current;

    if (tool === 'eraser') {
      eraseAlongStroke(prev.x, prev.y, x, y);
      lastCoordRef.current = { x, y };
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.lineTo(x, y);
    ctx.stroke();
    lastCoordRef.current = { x, y };
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(prev, 0, 0);
  };

  const clearCanvas = () => {
    loadTemplateToCanvas(selectedPage);
  };

  const downloadArt = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `pandanest-drawing-${selectedPage ? `page-${selectedPage}` : 'freehand'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const printArt = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Panda Nest Drawing</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
          <img src="${dataUrl}" style="max-width:100%;max-height:98vh;" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    win.document.close();
  };

  const startPageIdx = pageGroup * PAGES_PER_GROUP + 1;
  const endPageIdx = Math.min(TOTAL_BOOK_PAGES, startPageIdx + PAGES_PER_GROUP - 1);
  const totalGroups = Math.ceil(TOTAL_BOOK_PAGES / PAGES_PER_GROUP);

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => onNavigate ? onNavigate('games') : window.history.back()}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Panda Club
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBuyFullBookPdf}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              padding: '9px 18px',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={15} color="#fde047" /> Buy Full Book PDF • ₹9 Only
          </button>
        </div>
      </div>

      {/* ₹9 Full Printable Book Promo Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #ecfdf5 100%)',
          border: '1.5px solid #6ee7b7',
          borderRadius: '16px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            📚
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#065f46' }}>
              Want the Full 118-Page Printable Drawing Book?
            </div>
            <div style={{ fontSize: '0.84rem', color: '#047857' }}>
              Get all 118 high-resolution pages in one printable PDF for only ₹9!
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBuyFullBookPdf}
          style={{
            background: '#059669',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '0.88rem',
            padding: '9px 20px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
          }}
        >
          <FileDown size={15} /> Buy &amp; Download PDF (₹9)
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span className="badge badge-amber" style={{ fontSize: '0.82rem', marginBottom: '8px' }}>
          🎨 Little Artist Studio • 118 Coloring Pages Included!
        </span>
        <h1 style={{ fontSize: '2.1rem', color: '#0f172a', fontWeight: '900', marginBottom: '6px' }}>
          Panda Magic Coloring Book &amp; Canvas 🐼✨
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Pick any page from our 118-page Drawing Book, use <strong>Tap-to-Fill Bucket</strong> or <strong>Brush</strong>, then Save or Print!
        </p>
      </div>

      {/* Mode Switch + Quick Page Navigation */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: showBookDrawer ? '14px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setShowBookDrawer(!showBookDrawer);
                if (!selectedPage) handleSelectPage(1);
              }}
              className={`btn btn-sm ${selectedPage ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}
            >
              <BookOpen size={16} />
              <span>📖 Drawing Book ({selectedPage ? `Page ${selectedPage}/118` : '118 Pages'})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPage(null)}
              className={`btn btn-sm ${!selectedPage ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontWeight: '700' }}
            >
              📄 Blank Canvas
            </button>
          </div>

          {/* Quick Page Prev / Next & Dropdown */}
          {selectedPage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrevPage}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '0.8rem' }}
                title="Previous Coloring Page"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <select
                value={selectedPage || 1}
                onChange={(e) => handleSelectPage(Number(e.target.value))}
                style={{
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: TOTAL_BOOK_PAGES }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    Page {p} of {TOTAL_BOOK_PAGES}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextPage}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '0.8rem' }}
                title="Next Coloring Page"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}

          {showBookDrawer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={pageGroup === 0}
                onClick={() => setPageGroup(g => Math.max(0, g - 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 10px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                Pages {startPageIdx}–{endPageIdx} of {TOTAL_BOOK_PAGES}
              </span>
              <button
                type="button"
                disabled={pageGroup >= totalGroups - 1}
                onClick={() => setPageGroup(g => Math.min(totalGroups - 1, g + 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 10px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {showBookDrawer && (
          <>
            {customPages.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#047857', marginBottom: '6px' }}>
                  ✨ Extra Pages Added by Panda Nest ({customPages.length})
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {customPages.map((cp) => {
                    const isActive = selectedPage === cp.image_url;
                    return (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => handleSelectPage(cp.image_url)}
                        style={{
                          minWidth: '82px',
                          background: '#ffffff',
                          border: isActive ? '2.5px solid #10b981' : '1.5px solid #a7f3d0',
                          borderRadius: '10px',
                          padding: '4px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <img
                          src={cp.image_url}
                          alt={cp.title}
                          style={{ width: '72px', height: '64px', objectFit: 'contain', borderRadius: '6px', background: '#f8fafc' }}
                        />
                        <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#047857', marginTop: '2px', maxWidth: '74px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cp.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: '10px' }}>
            {Array.from({ length: endPageIdx - startPageIdx + 1 }, (_, i) => startPageIdx + i).map((pNum) => {
              const padded = String(pNum).padStart(3, '0');
              const isActive = selectedPage === pNum;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => handleSelectPage(pNum)}
                  style={{
                    background: '#ffffff',
                    border: isActive ? '2.5px solid #10b981' : '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: isActive ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none'
                  }}
                >
                  <img
                    src={`/drawing-book/page-${padded}.jpg`}
                    alt={`Page ${pNum}`}
                    loading="lazy"
                    style={{ width: '100%', height: '68px', objectFit: 'contain', borderRadius: '6px', background: '#f8fafc' }}
                  />
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: isActive ? '#047857' : '#64748b', marginTop: '2px' }}>
                    #{pNum}
                  </div>
                </button>
              );
            })}
            </div>
          </>
        )}
      </div>

      {/* Canvas Toolbars */}
      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          {/* Tools: Bucket Fill, Brush, Eraser */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTool('fill')}
              className={`btn btn-sm ${tool === 'fill' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '800' }}
            >
              <PaintBucket size={15} /> Tap-to-Fill
            </button>
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`btn btn-sm ${tool === 'brush' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}
            >
              <Pencil size={15} /> Brush
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: '700',
                background: tool === 'eraser' ? '#ef4444' : undefined,
                borderColor: tool === 'eraser' ? '#ef4444' : undefined
              }}
            >
              <Eraser size={15} /> Eraser
            </button>
          </div>

          {/* Colors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCurrentColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c,
                  border: currentColor === c && tool !== 'eraser' ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  transform: currentColor === c && tool !== 'eraser' ? 'scale(1.18)' : 'none',
                  transition: 'transform 0.1s ease'
                }}
              />
            ))}
          </div>

          {/* Brush Sizes */}
          {tool !== 'fill' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Size:</span>
              {BRUSH_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: brushSize === sz ? '#059669' : '#ffffff',
                    color: brushSize === sz ? '#ffffff' : '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleUndo}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Undo2 size={15} /> Undo
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={15} /> Reset
            </button>
            <button
              type="button"
              onClick={printArt}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Printer size={15} /> Print
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
      <div style={{ background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{
            width: '100%',
            maxWidth: '960px',
            height: 'auto',
            aspectRatio: '960 / 560',
            display: 'block',
            cursor: tool === 'fill' ? 'pointer' : tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none'
          }}
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
