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

export default router;

