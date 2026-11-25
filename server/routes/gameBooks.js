import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

export const DEFAULT_GAME_BOOKS = {
  drawing: {
    game_key: 'drawing',
    title: 'Panda Nest 118-Page Jumbo Activity & Coloring Book (PDF Download)',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-001.jpg',
    description: '118 High-Resolution Printable Animals, Vehicles, Dinosaurs & Fantasy coloring pages. Instant download upon checkout.',
    pdf_url: '/drawing-book/sample-coloring-book.pdf',
    enabled: true
  },
  truthDare: {
    game_key: 'truthDare',
    title: 'Panda 100 Family Truth & Dare Party Cards Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-001.jpg',
    description: '100 printable Family Truth & Dare cards for unforgettable game nights, birthday parties & family bonding!',
    pdf_url: '/drawing-book/truth-dare-cards.pdf',
    enabled: true
  },
  balloon: {
    game_key: 'balloon',
    title: 'Panda Pop & Learn Math & Colors Activity Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-002.jpg',
    description: '50+ fun balloon popping, dot-to-dot & coloring exercises to boost toddler hand-eye coordination.',
    pdf_url: '/drawing-book/balloon-activity.pdf',
    enabled: true
  },
  bamboo: {
    game_key: 'bamboo',
    title: 'Panda Bamboo Forest Adventure & Maze Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-003.jpg',
    description: 'Help baby panda navigate 40 winding bamboo mazes, spot-the-difference puzzles, and hidden treasure maps.',
    pdf_url: '/drawing-book/bamboo-mazes.pdf',
    enabled: true
  },
  spin: {
    game_key: 'spin',
    title: 'Panda Spin & Win Family Board Game Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-004.jpg',
    description: 'Printable DIY spin wheel board game sheets with paw tokens and reward cards for 2-6 players.',
    pdf_url: '/drawing-book/spin-game-book.pdf',
    enabled: true
  },
  memory: {
    game_key: 'memory',
    title: 'Panda Memory Champions Brain Booster Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-005.jpg',
    description: 'Cognitive brain-teaser flashcards, pattern matching, and memory drills designed by child psychologists.',
    pdf_url: '/drawing-book/memory-cards.pdf',
    enabled: true
  },
  trivia: {
    game_key: 'trivia',
    title: '500 Fun Panda Kids Trivia & Quiz Book',
    price: 9,
    original_price: 99,
    image_url: '/drawing-book/page-006.jpg',
    description: '500 mind-boggling science, nature, dinosaur, and space trivia questions that make kids 10x smarter!',
    pdf_url: '/drawing-book/trivia-quiz-book.pdf',
    enabled: true
  }
};

// GET /api/game-books - List all game books
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      try {
        const result = await pool.query('SELECT * FROM game_books ORDER BY id ASC');
        if (result.rows.length > 0) {
          const map = {};
          result.rows.forEach(r => { map[r.game_key] = r; });
          return res.json(map);
        }
      } catch (e) {
        // Table may need initialization
      }
    }

    const store = readLocalStore();
    const books = store.game_books || DEFAULT_GAME_BOOKS;
    return res.json(books);
  } catch (err) {
    console.error('Error fetching game books:', err);
    res.status(500).json({ error: 'Failed to fetch game books' });
  }
});

// GET /api/game-books/:gameKey - Get book for specific game
router.get('/:gameKey', async (req, res) => {
  try {
    const { gameKey } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query('SELECT * FROM game_books WHERE game_key = $1', [gameKey]);
        if (result.rows.length > 0) {
          return res.json(result.rows[0]);
        }
      } catch (e) {
        // fallback
      }
    }

    const store = readLocalStore();
    const books = store.game_books || DEFAULT_GAME_BOOKS;
    const book = books[gameKey] || DEFAULT_GAME_BOOKS[gameKey];
    if (book) return res.json(book);

    res.status(404).json({ error: 'Game book not found' });
  } catch (err) {
    console.error('Error fetching game book:', err);
    res.status(500).json({ error: 'Failed to fetch game book' });
  }
});

// PUT /api/game-books/:gameKey - Update/upsert book for specific game (Admin only)
router.put('/:gameKey', authenticateAdmin, async (req, res) => {
  try {
    const { gameKey } = req.params;
    const { title, price, original_price, image_url, description, pdf_url, enabled } = req.body;

    const numPrice = price !== undefined ? parseFloat(price) : 9;
    const numOriginal = original_price !== undefined ? parseFloat(original_price) : 99;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : true;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO game_books (game_key, title, price, original_price, image_url, description, pdf_url, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (game_key)
           DO UPDATE SET
             title = EXCLUDED.title,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             image_url = EXCLUDED.image_url,
             description = EXCLUDED.description,
             pdf_url = EXCLUDED.pdf_url,
             enabled = EXCLUDED.enabled
           RETURNING *`,
          [gameKey, title || 'Activity Book', numPrice, numOriginal, image_url || '', description || '', pdf_url || '', isEnabled]
        );
        return res.json(result.rows[0]);
      } catch (e) {
        console.warn('Postgres game_books update fallback:', e.message);
      }
    }

    const store = readLocalStore();
    if (!store.game_books) {
      store.game_books = { ...DEFAULT_GAME_BOOKS };
    }

    store.game_books[gameKey] = {
      game_key: gameKey,
      title: title || store.game_books[gameKey]?.title || 'Activity Book',
      price: numPrice,
      original_price: numOriginal,
      image_url: image_url || store.game_books[gameKey]?.image_url || '/drawing-book/page-001.jpg',
      description: description || store.game_books[gameKey]?.description || '',
      pdf_url: pdf_url || store.game_books[gameKey]?.pdf_url || '',
      enabled: isEnabled
    };

    writeLocalStore(store);
    res.json(store.game_books[gameKey]);
  } catch (err) {
    console.error('Error updating game book:', err);
    res.status(500).json({ error: 'Failed to update game book' });
  }
});

// POST /api/game-books - Create a new digital product / book
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { game_key, title, price, original_price, image_url, description, pdf_url, sample_pages, category, enabled } = req.body;
    const key = (game_key || title || 'digital-book')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);

    const numPrice = price !== undefined ? parseFloat(price) : 9;
    const numOriginal = original_price !== undefined ? parseFloat(original_price) : 99;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : true;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO game_books (game_key, title, price, original_price, image_url, description, pdf_url, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [key, title || 'Panda Nest Activity Book', numPrice, numOriginal, image_url || '', description || '', pdf_url || '', isEnabled]
        );
        return res.status(201).json(result.rows[0]);
      } catch (e) {
        console.warn('Postgres game_books insert error:', e.message);
      }
    }

    const store = readLocalStore();
    if (!store.game_books) {
      store.game_books = { ...DEFAULT_GAME_BOOKS };
    }

    store.game_books[key] = {
      game_key: key,
      title: title || 'Panda Nest Activity Book',
      price: numPrice,
      original_price: numOriginal,
      image_url: image_url || '/drawing-book/page-001.jpg',
      description: description || '',
      pdf_url: pdf_url || '',
      category: category || 'Activity & Coloring',
      sample_pages: sample_pages || [],
      enabled: isEnabled,
      created_at: new Date().toISOString()
    };

    writeLocalStore(store);
    res.status(201).json(store.game_books[key]);
  } catch (err) {
    console.error('Error creating digital book:', err);
    res.status(500).json({ error: 'Failed to create digital product' });
  }
});

// DELETE /api/game-books/:gameKey - Delete a digital product
router.delete('/:gameKey', authenticateAdmin, async (req, res) => {
  try {
    const { gameKey } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        await pool.query('DELETE FROM game_books WHERE game_key = $1', [gameKey]);
      } catch (e) {
        console.warn('Postgres delete game_book:', e.message);
      }
    }

    const store = readLocalStore();
    if (store.game_books && store.game_books[gameKey]) {
      delete store.game_books[gameKey];
      writeLocalStore(store);
    }

    res.json({ success: true, message: 'Digital product deleted successfully' });
  } catch (err) {
    console.error('Error deleting digital book:', err);
    res.status(500).json({ error: 'Failed to delete digital product' });
  }
});

// GET /api/game-books/secure-access/:gameKey - Check if current user or order has purchased access
router.get('/secure-access/:gameKey', async (req, res) => {
  try {
    const { gameKey } = req.params;
    const orderNumber = req.query.order_number;
    const userPhone = req.query.phone;
    const authHeader = req.headers.authorization;

    let hasAccess = false;
    let accessOrder = null;

    const { isPostgres, pool } = getDB();

    // Check by order number and phone
    if (orderNumber) {
      if (isPostgres && pool) {
        const ordRes = await pool.query(
          `SELECT * FROM orders WHERE (order_number = $1 OR CAST(id AS TEXT) = $1) LIMIT 1`,
          [orderNumber.trim()]
        );
        if (ordRes.rows.length > 0) {
          const ord = ordRes.rows[0];
          const isPaid = ord.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(ord.status);
          let items = [];
          try { items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []); } catch {}
          const matched = items.some(it => it.game_key === gameKey || it.id === `game-book-${gameKey}` || it.id === gameKey);
          if (matched && isPaid) {
            hasAccess = true;
            accessOrder = ord.order_number;
          }
        }
      } else {
        const store = readLocalStore();
        const orders = store.orders || [];
        const ord = orders.find(o => o.order_number === orderNumber.trim() || String(o.id) === orderNumber.trim());
        if (ord) {
          const isPaid = ord.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(ord.status);
          let items = [];
          try { items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []); } catch {}
          const matched = items.some(it => it.game_key === gameKey || it.id === `game-book-${gameKey}` || it.id === gameKey);
          if (matched && isPaid) {
            hasAccess = true;
            accessOrder = ord.order_number;
          }
        }
      }
    }

    // Get the book details
    let book = DEFAULT_GAME_BOOKS[gameKey];
    if (isPostgres && pool) {
      try {
        const bRes = await pool.query('SELECT * FROM game_books WHERE game_key = $1', [gameKey]);
        if (bRes.rows.length > 0) book = bRes.rows[0];
      } catch {}
    } else {
      const store = readLocalStore();
      if (store.game_books?.[gameKey]) book = store.game_books[gameKey];
    }

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (hasAccess) {
      return res.json({
        hasAccess: true,
        downloadUrl: book.pdf_url || '/drawing-book/sample-coloring-book.pdf',
        title: book.title,
        orderNumber: accessOrder
      });
    }

    return res.json({
      hasAccess: false,
      message: 'Purchase required to view or download full PDF document.',
      samplePreview: book.image_url || '/drawing-book/page-001.jpg'
    });
  } catch (err) {
    console.error('Secure access check error:', err);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

export default router;

