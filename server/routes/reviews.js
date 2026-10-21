import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateUser, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if a user has bought a toy
async function userHasPurchasedToy(userEmail, toyId) {
  if (!userEmail) return false;
  const { isPostgres, pool } = getDB();
  const normalizedEmail = userEmail.toLowerCase().trim();

  if (isPostgres && pool) {
    const res = await pool.query(
      `SELECT items FROM orders
       WHERE LOWER(user_email) = $1 AND status != 'Cancelled'`,
      [normalizedEmail]
    );
    for (const row of res.rows) {
      const items = Array.isArray(row.items) ? row.items : [];
      if (items.some(item => String(item.id) === String(toyId))) {
        return true;
      }
    }
    return false;
  } else {
    const store = readLocalStore();
    const orders = (store.orders || []).filter(o =>
      (o.user_email || '').toLowerCase().trim() === normalizedEmail && o.status !== 'Cancelled'
    );
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      if (items.some(item => String(item.id) === String(toyId))) {
        return true;
      }
    }
    return false;
  }
}

// GET /api/reviews/toy/:toyId - Public: Get approved reviews for a toy
router.get('/toy/:toyId', async (req, res) => {
  try {
    const { toyId } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `SELECT id, toy_id, user_name, rating, comment, created_at
         FROM reviews
         WHERE toy_id = $1 AND status = 'approved'
         ORDER BY created_at DESC`,
        [toyId]
      );
      const rows = result.rows;
      const count = rows.length;
      const avg = count > 0 ? (rows.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1) : 0;
      return res.json({ reviews: rows, averageRating: Number(avg), totalReviews: count });
    } else {
      const store = readLocalStore();
      const reviews = (store.reviews || [])
        .filter(r => String(r.toy_id) === String(toyId) && r.status === 'approved')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const count = reviews.length;
      const avg = count > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1) : 0;
      return res.json({ reviews, averageRating: Number(avg), totalReviews: count });
    }
  } catch (err) {
    console.error('Fetch toy reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// GET /api/reviews/can-review/:toyId - Authenticated: Check if current user bought this toy
router.get('/can-review/:toyId', authenticateUser, async (req, res) => {
  try {
    const { toyId } = req.params;
    const userEmail = req.user.email;
    const purchased = await userHasPurchasedToy(userEmail, toyId);

    // Also check if user already reviewed
    const { isPostgres, pool } = getDB();
    let alreadyReviewed = false;
    if (isPostgres && pool) {
      const revCheck = await pool.query(
        'SELECT id FROM reviews WHERE toy_id = $1 AND LOWER(user_email) = $2',
        [toyId, userEmail.toLowerCase().trim()]
      );
      alreadyReviewed = revCheck.rows.length > 0;
    } else {
      const store = readLocalStore();
      alreadyReviewed = (store.reviews || []).some(
        r => String(r.toy_id) === String(toyId) && (r.user_email || '').toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
    }

    return res.json({
      canReview: purchased && !alreadyReviewed,
      purchased,
      alreadyReviewed
    });
  } catch (err) {
    console.error('Can review check error:', err);
    res.status(500).json({ error: 'Failed to check review eligibility.' });
  }
});

// POST /api/reviews - Authenticated: Submit review (Only verified buyers)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { toy_id, rating, comment } = req.body;
    const userEmail = req.user.email;
    const userName = req.user.name || 'Verified Buyer';

    if (!toy_id) {
      return res.status(400).json({ error: 'Toy ID is required.' });
    }
    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    // Verify buyer status
    const purchased = await userHasPurchasedToy(userEmail, toy_id);
    if (!purchased) {
      return res.status(403).json({
        error: 'Only customers who have purchased this toy can submit a review.'
      });
    }

    const { isPostgres, pool } = getDB();
    const cleanComment = (comment || '').trim();

    if (isPostgres && pool) {
      // Check duplicate
      const revCheck = await pool.query(
        'SELECT id FROM reviews WHERE toy_id = $1 AND LOWER(user_email) = $2',
        [toy_id, userEmail.toLowerCase().trim()]
      );
      if (revCheck.rows.length > 0) {
        return res.status(400).json({ error: 'You have already reviewed this toy.' });
      }

      const result = await pool.query(
        `INSERT INTO reviews (toy_id, user_email, user_name, rating, comment, status)
         VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING *`,
        [toy_id, userEmail.toLowerCase().trim(), userName, numRating, cleanComment]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.reviews) store.reviews = [];
      const revCheck = store.reviews.some(
        r => String(r.toy_id) === String(toy_id) && (r.user_email || '').toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
      if (revCheck) {
        return res.status(400).json({ error: 'You have already reviewed this toy.' });
      }

      const newReview = {
        id: Date.now(),
        toy_id: Number(toy_id),
        user_email: userEmail.toLowerCase().trim(),
        user_name: userName,
        rating: numRating,
        comment: cleanComment,
        status: 'approved',
        created_at: new Date().toISOString()
      };
      store.reviews.push(newReview);
      writeLocalStore(store);
      return res.status(201).json(newReview);
    }
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review: ' + err.message });
  }
});

// GET /api/reviews/admin - Admin: List all reviews for moderation
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const result = await pool.query(
        `SELECT r.*, t.name as toy_name, t.image_url as toy_image
         FROM reviews r
         LEFT JOIN toys t ON r.toy_id = t.id
         ORDER BY r.created_at DESC`
      );
      return res.json(result.rows);
    } else {
      const store = readLocalStore();
      const toysMap = new Map((store.toys || []).map(t => [String(t.id), t]));
      const list = (store.reviews || []).map(r => {
        const toy = toysMap.get(String(r.toy_id));
        return {
          ...r,
          toy_name: toy ? toy.name : 'Unknown Toy',
          toy_image: toy ? toy.image_url : ''
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(list);
    }
  } catch (err) {
    console.error('Admin fetch reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews/admin-create - Admin: Generate custom / promo review for any toy
router.post('/admin-create', authenticateAdmin, async (req, res) => {
  try {
    const { toy_id, user_name, user_email, rating, comment, status } = req.body;
    if (!toy_id) {
      return res.status(400).json({ error: 'Toy ID is required.' });
    }
    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }
    const cleanName = (user_name || 'Verified Parent').trim();
    const cleanEmail = (user_email || `parent_${Date.now()}@pandanest.in`).trim().toLowerCase();
    const cleanComment = (comment || '').trim();
    const reviewStatus = ['approved', 'hidden', 'rejected', 'pending'].includes(status) ? status : 'approved';

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO reviews (toy_id, user_email, user_name, rating, comment, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [toy_id, cleanEmail, cleanName, numRating, cleanComment, reviewStatus]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.reviews) store.reviews = [];
      const newReview = {
        id: Date.now(),
        toy_id: Number(toy_id),
        user_email: cleanEmail,
        user_name: cleanName,
        rating: numRating,
        comment: cleanComment,
        status: reviewStatus,
        created_at: new Date().toISOString()
      };
      store.reviews.push(newReview);
      writeLocalStore(store);
      return res.status(201).json(newReview);
    }
  } catch (err) {
    console.error('Admin create review error:', err);
    res.status(500).json({ error: 'Failed to create review: ' + err.message });
  }
});

// PATCH /api/reviews/:id/status - Admin: Moderate review status ('approved' | 'hidden' | 'rejected' | 'pending')
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'hidden', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, hidden, rejected, or pending.' });
    }

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        'UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found.' });
      }
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.reviews) store.reviews = [];
      const review = store.reviews.find(r => String(r.id) === String(id));
      if (!review) {
        return res.status(404).json({ error: 'Review not found.' });
      }
      review.status = status;
      writeLocalStore(store);
      return res.json(review);
    }
  } catch (err) {
    console.error('Moderate review error:', err);
    res.status(500).json({ error: 'Failed to update review status.' });
  }
});

// DELETE /api/reviews/:id - Admin: Delete review
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Review not found.' });
      }
    } else {
      const store = readLocalStore();
      if (!store.reviews) store.reviews = [];
      const before = store.reviews.length;
      store.reviews = store.reviews.filter(r => String(r.id) !== String(id));
      if (store.reviews.length === before) {
        return res.status(404).json({ error: 'Review not found.' });
      }
      writeLocalStore(store);
    }
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

export default router;
