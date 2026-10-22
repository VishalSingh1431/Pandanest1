import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

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
