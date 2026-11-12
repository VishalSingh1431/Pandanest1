import express from 'express';
import multer from 'multer';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { uploadToCloudinary } from '../cloudinary.js';

const router = express.Router();

const uploadDrawing = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

// Helper to extract YouTube video ID from various URL formats
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  // If already 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

// GET /api/videos/intro - Public: Get Panda Club main showcase video
router.get('/intro', async (req, res) => {
  const defaultIntro = {
    youtube_id: '3vTfq_724jM',
    youtube_url: 'https://www.youtube.com/watch?v=3vTfq_724jM',
    title: 'Panda Nest Adventures & Storytime',
    enabled: true
  };
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const result = await pool.query("SELECT value FROM site_settings WHERE key = 'club_intro_video'");
      if (result.rows.length > 0 && result.rows[0].value) {
        return res.json({ ...defaultIntro, ...result.rows[0].value });
      }
      return res.json(defaultIntro);
    } else {
      const store = readLocalStore();
      return res.json(store.club_intro_video ? { ...defaultIntro, ...store.club_intro_video } : defaultIntro);
    }
  } catch (err) {
    console.error('Fetch intro video error:', err);
    return res.json(defaultIntro);
  }
});

// PUT /api/videos/intro - Admin: Update Panda Club main showcase video
router.put('/intro', authenticateAdmin, async (req, res) => {
  try {
    const { youtube_url, youtube_id, title, enabled } = req.body;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : true;
    const ytId = extractYouTubeId(youtube_url || youtube_id);

    if (isEnabled && !ytId) {
      return res.status(400).json({ error: 'Please enter a valid YouTube link or 11-character Video ID.' });
    }

    const payload = {
      youtube_id: ytId || '',
      youtube_url: (youtube_url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '')).trim(),
      title: (title || 'Panda Nest Adventures & Storytime').trim(),
      enabled: isEnabled
    };

    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ('club_intro_video', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(payload)]
      );
    } else {
      const store = readLocalStore();
      store.club_intro_video = payload;
      writeLocalStore(store);
    }

    return res.json({ success: true, intro: payload });
  } catch (err) {
    console.error('Update intro video error:', err);
    res.status(500).json({ error: 'Failed to update main showcase video: ' + err.message });
  }
});

// GET /api/videos/drawing-pages - Public: List admin-added drawing book pages
router.get('/drawing-pages', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const result = await pool.query("SELECT value FROM site_settings WHERE key = 'custom_drawing_pages'");
      const pages = result.rows[0]?.value;
      return res.json(Array.isArray(pages) ? pages : []);
    } else {
      const store = readLocalStore();
      return res.json(Array.isArray(store.custom_drawing_pages) ? store.custom_drawing_pages : []);
    }
  } catch (err) {
    console.error('Fetch drawing pages error:', err);
    return res.json([]);
  }
});

// POST /api/videos/drawing-pages - Admin: Upload/add a new drawing book page
router.post('/drawing-pages', authenticateAdmin, uploadDrawing.single('image'), async (req, res) => {
  try {
    let imageUrl = (req.body.image_url || '').trim();
    const title = (req.body.title || 'Custom Coloring Page').trim();

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, 'pandanest_drawing_book');
      imageUrl = uploaded.secure_url || uploaded.url;
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Please upload an image file or provide an image URL.' });
    }

    const newPage = {
      id: Date.now(),
      title,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };

    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const existing = await pool.query("SELECT value FROM site_settings WHERE key = 'custom_drawing_pages'");
      const pages = Array.isArray(existing.rows[0]?.value) ? existing.rows[0].value : [];
      pages.unshift(newPage);
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ('custom_drawing_pages', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(pages)]
      );
    } else {
      const store = readLocalStore();
      store.custom_drawing_pages = Array.isArray(store.custom_drawing_pages) ? store.custom_drawing_pages : [];
      store.custom_drawing_pages.unshift(newPage);
      writeLocalStore(store);
    }

    return res.status(201).json(newPage);
  } catch (err) {
    console.error('Add drawing page error:', err);
    res.status(500).json({ error: 'Failed to add drawing page: ' + err.message });
  }
});

// DELETE /api/videos/drawing-pages/:pageId - Admin: Remove a custom drawing page
router.delete('/drawing-pages/:pageId', authenticateAdmin, async (req, res) => {
  try {
    const pageId = String(req.params.pageId);
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const existing = await pool.query("SELECT value FROM site_settings WHERE key = 'custom_drawing_pages'");
      const pages = Array.isArray(existing.rows[0]?.value) ? existing.rows[0].value : [];
      const updated = pages.filter(p => String(p.id) !== pageId);
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ('custom_drawing_pages', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(updated)]
      );
    } else {
      const store = readLocalStore();
      store.custom_drawing_pages = (store.custom_drawing_pages || []).filter(p => String(p.id) !== pageId);
      writeLocalStore(store);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete drawing page error:', err);
    res.status(500).json({ error: 'Failed to delete drawing page.' });
  }
});

// GET /api/videos - Public: List activity videos
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM videos ORDER BY id ASC');
      return res.json(result.rows);
    } else {
      const store = readLocalStore();
      const videos = (store.videos || []).sort((a, b) => a.id - b.id);
      return res.json(videos);
    }
  } catch (err) {
    console.error('Fetch videos error:', err);
    res.status(500).json({ error: 'Failed to fetch videos.' });
  }
});

// POST /api/videos - Admin: Add video via YouTube link or ID
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { youtube_url, youtube_id, title, category, channel, duration_sec, description, points_reward } = req.body;

    const ytId = extractYouTubeId(youtube_url || youtube_id);
    if (!ytId) {
      return res.status(400).json({ error: 'Valid YouTube link or 11-character video ID is required.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Video title is required.' });
    }

    const cleanTitle = title.trim();
    const cleanCategory = (category || 'Cartoons').trim();
    const cleanChannel = (channel || 'Panda Nest Kids Club').trim();
    const cleanDesc = (description || '').trim();
    const duration = parseInt(duration_sec, 10) || 40;
    const points = parseInt(points_reward, 10) || 10;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO videos (youtube_id, title, category, channel, duration_sec, description, points_reward)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [ytId, cleanTitle, cleanCategory, cleanChannel, duration, cleanDesc, points]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.videos) store.videos = [];
      const newVideo = {
        id: Date.now(),
        youtube_id: ytId,
        title: cleanTitle,
        category: cleanCategory,
        channel: cleanChannel,
        duration_sec: duration,
        description: cleanDesc,
        points_reward: points,
        created_at: new Date().toISOString()
      };
      store.videos.push(newVideo);
      writeLocalStore(store);
      return res.status(201).json(newVideo);
    }
  } catch (err) {
    console.error('Add video error:', err);
    res.status(500).json({ error: 'Failed to add video: ' + err.message });
  }
});

// PUT /api/videos/:id - Admin: Update video details
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { youtube_url, youtube_id, title, category, channel, duration_sec, description, points_reward } = req.body;

    const ytId = extractYouTubeId(youtube_url || youtube_id);
    const cleanTitle = title !== undefined ? title.trim() : undefined;
    const cleanCategory = category !== undefined ? category.trim() : undefined;
    const cleanChannel = channel !== undefined ? channel.trim() : undefined;
    const cleanDesc = description !== undefined ? description.trim() : undefined;
    const duration = duration_sec !== undefined ? parseInt(duration_sec, 10) : undefined;
    const points = points_reward !== undefined ? parseInt(points_reward, 10) : undefined;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const existing = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      const prev = existing.rows[0];

      const result = await pool.query(
        `UPDATE videos
         SET youtube_id = COALESCE($1, youtube_id),
             title = COALESCE($2, title),
             category = COALESCE($3, category),
             channel = COALESCE($4, channel),
             duration_sec = COALESCE($5, duration_sec),
             description = COALESCE($6, description),
             points_reward = COALESCE($7, points_reward)
         WHERE id = $8 RETURNING *`,
        [ytId || prev.youtube_id, cleanTitle || prev.title, cleanCategory || prev.category, cleanChannel || prev.channel, duration || prev.duration_sec, cleanDesc !== undefined ? cleanDesc : prev.description, points || prev.points_reward, id]
      );
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.videos) store.videos = [];
      const index = store.videos.findIndex(v => String(v.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      const prev = store.videos[index];
      const updated = {
        ...prev,
        youtube_id: ytId || prev.youtube_id,
        title: cleanTitle !== undefined ? cleanTitle : prev.title,
        category: cleanCategory !== undefined ? cleanCategory : prev.category,
        channel: cleanChannel !== undefined ? cleanChannel : prev.channel,
        duration_sec: duration !== undefined ? duration : prev.duration_sec,
        description: cleanDesc !== undefined ? cleanDesc : prev.description,
        points_reward: points !== undefined ? points : prev.points_reward
      };
      store.videos[index] = updated;
      writeLocalStore(store);
      return res.json(updated);
    }
  } catch (err) {
    console.error('Update video error:', err);
    res.status(500).json({ error: 'Failed to update video: ' + err.message });
  }
});

// DELETE /api/videos/:id - Admin: Delete video
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query('DELETE FROM videos WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Video not found.' });
      }
    } else {
      const store = readLocalStore();
      if (!store.videos) store.videos = [];
      const before = store.videos.length;
      store.videos = store.videos.filter(v => String(v.id) !== String(id));
      if (store.videos.length === before) {
        return res.status(404).json({ error: 'Video not found.' });
      }
      writeLocalStore(store);
    }

    return res.json({ success: true, message: 'Video deleted successfully.' });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ error: 'Failed to delete video: ' + err.message });
  }
});

export default router;
