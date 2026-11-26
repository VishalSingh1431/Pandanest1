import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin, JWT_SECRET } from '../middleware/auth.js';
import { uploadToCloudinary, uploadRawToCloudinary } from '../cloudinary.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed.'));
    }
  }
});

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

// Helper: mask pdf_url for public consumption
function sanitizeBookForPublic(book) {
  if (!book) return book;
  const clone = { ...book };
  // Hide actual secret pdf_url from public visitor APIs, replacing with boolean flag
  clone.has_pdf = Boolean(clone.pdf_url);
  delete clone.pdf_url;
  return clone;
}

// GET /api/game-books - List all game books (public safe)
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      try {
        const result = await pool.query('SELECT * FROM game_books ORDER BY id ASC');
        if (result.rows.length > 0) {
          const map = {};
          result.rows.forEach(r => { map[r.game_key] = sanitizeBookForPublic(r); });
          return res.json(map);
        }
      } catch (e) {
        // Table may need initialization
      }
    }

    const store = readLocalStore();
    const books = store.game_books || DEFAULT_GAME_BOOKS;
    const sanitizedMap = {};
    Object.keys(books).forEach(k => {
      sanitizedMap[k] = sanitizeBookForPublic(books[k]);
    });
    return res.json(sanitizedMap);
  } catch (err) {
    console.error('Error fetching game books:', err);
    res.status(500).json({ error: 'Failed to fetch game books' });
  }
});

// GET /api/game-books/:gameKey - Get book for specific game (public safe)
router.get('/:gameKey', async (req, res) => {
  try {
    const { gameKey } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query('SELECT * FROM game_books WHERE game_key = $1', [gameKey]);
        if (result.rows.length > 0) {
          return res.json(sanitizeBookForPublic(result.rows[0]));
        }
      } catch (e) {
        // fallback
      }
    }

    const store = readLocalStore();
    const books = store.game_books || DEFAULT_GAME_BOOKS;
    const book = books[gameKey] || DEFAULT_GAME_BOOKS[gameKey];
    if (book) return res.json(sanitizeBookForPublic(book));

    res.status(404).json({ error: 'Game book not found' });
  } catch (err) {
    console.error('Error fetching game book:', err);
    res.status(500).json({ error: 'Failed to fetch game book' });
  }
});

// POST /api/game-books/upload-pdf - Dedicated direct PDF file upload to Cloudinary (Admin only)
router.post('/upload-pdf', authenticateAdmin, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF documents (.pdf) are allowed.' });
    }

    const uploadResult = await uploadRawToCloudinary(req.file.buffer, req.file.originalname);
    return res.json({
      success: true,
      url: uploadResult.url,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading PDF document:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload PDF file to secure storage.' });
  }
});

// PUT /api/game-books/:gameKey - Update/upsert book with multi-image support (Admin only)
router.put('/:gameKey', authenticateAdmin, upload.array('images', 15), async (req, res) => {
  try {
    const { gameKey } = req.params;
    const {
      title,
      price,
      original_price,
      image_url,
      image_url_manual,
      images_manual,
      existing_images,
      description,
      pdf_url,
      category,
      age_group,
      pages_count,
      enabled
    } = req.body;

    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype));
      const results = await Promise.all(uploadPromises);
      for (const result of results) {
        if (result && result.url) uploadedUrls.push(result.url);
      }
    }

    let manualList = [];
    if (images_manual) {
      try {
        manualList = Array.isArray(images_manual) ? images_manual : JSON.parse(images_manual);
      } catch (e) {
        manualList = images_manual.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (image_url_manual) {
      manualList = image_url_manual.split(',').map(s => s.trim()).filter(Boolean);
    }

    let keptImages = [];
    if (existing_images) {
      try {
        keptImages = Array.isArray(existing_images) ? existing_images : JSON.parse(existing_images);
      } catch (e) {
        keptImages = [];
      }
    }

    const allImages = Array.from(new Set([...keptImages, ...uploadedUrls, ...manualList]));
    const finalImageUrl = allImages[0] || image_url || '/drawing-book/page-001.jpg';
    if (!allImages.includes(finalImageUrl)) {
      allImages.unshift(finalImageUrl);
    }

    const numPrice = price !== undefined ? parseFloat(price) : 9;
    const numOriginal = original_price !== undefined ? parseFloat(original_price) : 99;
    const isEnabled = enabled !== undefined ? (enabled === 'true' || enabled === true) : true;
    const bookCategory = category || 'Activity & Coloring';
    const bookAge = age_group || 'All Ages';
    const bookPages = pages_count || '50+ Pages';
    const bookDesc = description || '';
    const bookPdf = pdf_url || '';
    const imagesJson = JSON.stringify(allImages);

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO game_books (game_key, title, price, original_price, image_url, images, category, age_group, pages_count, description, pdf_url, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (game_key)
           DO UPDATE SET
             title = EXCLUDED.title,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             image_url = EXCLUDED.image_url,
             images = EXCLUDED.images,
             category = EXCLUDED.category,
             age_group = EXCLUDED.age_group,
             pages_count = EXCLUDED.pages_count,
             description = EXCLUDED.description,
             pdf_url = EXCLUDED.pdf_url,
             enabled = EXCLUDED.enabled
           RETURNING *`,
          [gameKey, title || 'Activity Book', numPrice, numOriginal, finalImageUrl, imagesJson, bookCategory, bookAge, bookPages, bookDesc, bookPdf, isEnabled]
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
      ...(store.game_books[gameKey] || {}),
      game_key: gameKey,
      title: title || store.game_books[gameKey]?.title || 'Activity Book',
      price: numPrice,
      original_price: numOriginal,
      image_url: finalImageUrl,
      images: imagesJson,
      category: bookCategory,
      age_group: bookAge,
      pages_count: bookPages,
      description: bookDesc,
      pdf_url: bookPdf,
      enabled: isEnabled
    };

    writeLocalStore(store);
    res.json(store.game_books[gameKey]);
  } catch (err) {
    console.error('Error updating game book:', err);
    res.status(500).json({ error: 'Failed to update game book' });
  }
});

// POST /api/game-books - Create a new digital product / book with multi-image support
router.post('/', authenticateAdmin, upload.array('images', 15), async (req, res) => {
  try {
    const {
      game_key,
      title,
      price,
      original_price,
      image_url,
      image_url_manual,
      images_manual,
      description,
      pdf_url,
      category,
      age_group,
      pages_count,
      enabled
    } = req.body;

    const key = (game_key || title || 'digital-book')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);

    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype));
      const results = await Promise.all(uploadPromises);
      for (const result of results) {
        if (result && result.url) uploadedUrls.push(result.url);
      }
    }

    let manualList = [];
    if (images_manual) {
      try {
        manualList = Array.isArray(images_manual) ? images_manual : JSON.parse(images_manual);
      } catch (e) {
        manualList = images_manual.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (image_url_manual) {
      manualList = image_url_manual.split(',').map(s => s.trim()).filter(Boolean);
    }

    const allImages = Array.from(new Set([...uploadedUrls, ...manualList]));
    const finalImageUrl = allImages[0] || image_url || '/drawing-book/page-001.jpg';
    if (!allImages.includes(finalImageUrl)) {
      allImages.unshift(finalImageUrl);
    }

    const numPrice = price !== undefined ? parseFloat(price) : 9;
    const numOriginal = original_price !== undefined ? parseFloat(original_price) : 99;
    const isEnabled = enabled !== undefined ? (enabled === 'true' || enabled === true) : true;
    const bookCategory = category || 'Activity & Coloring';
    const bookAge = age_group || 'All Ages';
    const bookPages = pages_count || '50+ Pages';
    const bookDesc = description || '';
    const bookPdf = pdf_url || '';
    const imagesJson = JSON.stringify(allImages);

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO game_books (game_key, title, price, original_price, image_url, images, category, age_group, pages_count, description, pdf_url, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [key, title || 'Panda Nest Activity Book', numPrice, numOriginal, finalImageUrl, imagesJson, bookCategory, bookAge, bookPages, bookDesc, bookPdf, isEnabled]
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
      image_url: finalImageUrl,
      images: imagesJson,
      category: bookCategory,
      age_group: bookAge,
      pages_count: bookPages,
      description: bookDesc,
      pdf_url: bookPdf,
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

    let userEmail = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        userEmail = decoded.email || decoded.user?.email;
        if (!userPhone && decoded.phone) userPhone = decoded.phone;
      } catch (tokenErr) {
        // invalid token, proceed with order check
      }
    }

    // Check by user email or phone across all paid orders
    if (!hasAccess && (userEmail || userPhone)) {
      if (isPostgres && pool) {
        const userOrdRes = await pool.query(
          `SELECT * FROM orders WHERE (LOWER(customer_email) = LOWER($1) OR customer_phone = $2) AND (payment_status = 'paid' OR status IN ('Confirmed', 'Dispatched', 'Delivered')) ORDER BY id DESC`,
          [userEmail || '', userPhone || '']
        );
        for (const ord of userOrdRes.rows) {
          let items = [];
          try { items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []); } catch {}
          const matched = items.some(it => it.game_key === gameKey || it.id === `game-book-${gameKey}` || it.id === gameKey);
          if (matched) {
            hasAccess = true;
            accessOrder = ord.order_number;
            break;
          }
        }
      } else {
        const store = readLocalStore();
        const orders = store.orders || [];
        const matchingOrders = orders.filter(o => {
          const matchEmail = userEmail && (o.customer_email || '').toLowerCase() === userEmail.toLowerCase();
          const matchPhone = userPhone && String(o.customer_phone || '').trim() === String(userPhone).trim();
          const isPaid = o.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(o.status);
          return (matchEmail || matchPhone) && isPaid;
        });

        for (const ord of matchingOrders) {
          let items = [];
          try { items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []); } catch {}
          const matched = items.some(it => it.game_key === gameKey || it.id === `game-book-${gameKey}` || it.id === gameKey);
          if (matched) {
            hasAccess = true;
            accessOrder = ord.order_number;
            break;
          }
        }
      }
    }
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

