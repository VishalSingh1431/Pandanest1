import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateUser, authenticateAdmin, optionalUser } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if a user has bought a toy (by email or 10-digit mobile number)
async function userHasPurchasedToy(userEmail, userPhone, toyId) {
  if (!userEmail && !userPhone) return false;
  const { isPostgres, pool } = getDB();
  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const rawPhone = String(userPhone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '';

  if (isPostgres && pool) {
    let query = '';
    let params = [];

    if (normalizedEmail && cleanPhone) {
      query = `SELECT items FROM orders
               WHERE (LOWER(user_email) = $1 OR RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $2)
                 AND status != 'Cancelled'`;
      params = [normalizedEmail, cleanPhone];
    } else if (normalizedEmail) {
      query = `SELECT items FROM orders
               WHERE LOWER(user_email) = $1 AND status != 'Cancelled'`;
      params = [normalizedEmail];
    } else if (cleanPhone) {
      query = `SELECT items FROM orders
               WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $1 AND status != 'Cancelled'`;
      params = [cleanPhone];
    } else {
      return false;
    }

    const res = await pool.query(query, params);
    for (const row of res.rows) {
      const items = Array.isArray(row.items) ? row.items : [];
      if (items.some(item => String(item.id) === String(toyId))) {
        return true;
      }
    }
    return false;
  } else {
    const store = readLocalStore();
    const orders = (store.orders || []).filter(o => {
      if (o.status === 'Cancelled') return false;
      const oEmail = (o.user_email || '').toLowerCase().trim();
      const oPhone = String(o.phone || '').replace(/\D/g, '').slice(-10);
      const emailMatch = normalizedEmail && oEmail === normalizedEmail;
      const phoneMatch = cleanPhone && oPhone === cleanPhone;
      return emailMatch || phoneMatch;
    });

    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      if (items.some(item => String(item.id) === String(toyId))) {
        return true;
      }
    }
    return false;
  }
}

// Helper to check if a user has already reviewed a toy
async function hasUserAlreadyReviewed(userEmail, userPhone, toyId) {
  if (!userEmail && !userPhone) return false;
  const { isPostgres, pool } = getDB();
  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const rawPhone = String(userPhone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '';

  if (isPostgres && pool) {
    let query = '';
    let params = [];
    if (normalizedEmail && cleanPhone) {
      query = `SELECT id FROM reviews
               WHERE toy_id = $1 AND (LOWER(user_email) = $2 OR LOWER(user_email) = $3)`;
      params = [parseInt(toyId, 10) || 0, normalizedEmail, cleanPhone];
    } else if (normalizedEmail) {
      query = `SELECT id FROM reviews
               WHERE toy_id = $1 AND LOWER(user_email) = $2`;
      params = [parseInt(toyId, 10) || 0, normalizedEmail];
    } else {
      query = `SELECT id FROM reviews
               WHERE toy_id = $1 AND LOWER(user_email) = $2`;
      params = [parseInt(toyId, 10) || 0, cleanPhone];
    }
    const res = await pool.query(query, params);
    return res.rows.length > 0;
  } else {
    const store = readLocalStore();
    return (store.reviews || []).some(r => {
      if (String(r.toy_id) !== String(toyId)) return false;
      const rEmail = (r.user_email || '').toLowerCase().trim();
      return (normalizedEmail && rEmail === normalizedEmail) || (cleanPhone && rEmail === cleanPhone);
    });
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
        [parseInt(toyId, 10) || 0]
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

// GET /api/reviews/can-review/:toyId - Check if current user or email/phone bought this toy
router.get('/can-review/:toyId', optionalUser, async (req, res) => {
  try {
    const { toyId } = req.params;
    const userEmail = (req.user?.email || req.query.email || '').toLowerCase().trim();
    const userPhone = (req.user?.phone || req.query.phone || '').replace(/\D/g, '').slice(-10);

    if (!userEmail && !userPhone) {
      return res.json({ canReview: false, purchased: false, alreadyReviewed: false, reason: 'not_provided' });
    }

    const purchased = await userHasPurchasedToy(userEmail, userPhone, toyId);
    const alreadyReviewed = await hasUserAlreadyReviewed(userEmail, userPhone, toyId);

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

// POST /api/reviews/public - Submit customer review (Enforces verified buyer purchase check)
router.post('/public', optionalUser, async (req, res) => {
  try {
    const { toy_id, rating, comment, user_name, user_email, user_phone } = req.body;
    if (!toy_id) return res.status(400).json({ error: 'Toy ID is required.' });

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    const cleanComment = (comment || '').trim();
    if (!cleanComment) {
      return res.status(400).json({ error: 'Please write a review comment.' });
    }

    const cleanName = (user_name || req.user?.name || 'Verified Buyer').trim();

    // Determine user email or phone: from JWT, body.user_email, or body.user_phone
    let emailInput = (user_email || req.user?.email || '').trim().toLowerCase();
    let phoneInput = (user_phone || req.user?.phone || '').trim();

    // If user entered a 10-digit number into the email field:
    if (!phoneInput && /^\d{10}$/.test(emailInput.replace(/\D/g, ''))) {
      phoneInput = emailInput.replace(/\D/g, '');
      emailInput = '';
    }

    if (!emailInput && !phoneInput) {
      return res.status(400).json({
        error: 'Please enter the email address or phone number used during checkout to verify your purchase.'
      });
    }

    // ENFORCE PURCHASE VERIFICATION:
    const purchased = await userHasPurchasedToy(emailInput, phoneInput, toy_id);
    if (!purchased) {
      return res.status(403).json({
        error: 'Only customers who have purchased this toy can submit a review. We could not find a completed order for this email/phone with this product.'
      });
    }

    // CHECK DUPLICATE REVIEW:
    const alreadyReviewed = await hasUserAlreadyReviewed(emailInput, phoneInput, toy_id);
    if (alreadyReviewed) {
      return res.status(400).json({
        error: 'You have already submitted a review for this toy.'
      });
    }

    const storedIdentifier = emailInput || phoneInput;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO reviews (toy_id, user_email, user_name, rating, comment, status)
         VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING *`,
        [parseInt(toy_id, 10) || 0, storedIdentifier, cleanName, numRating, cleanComment]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.reviews) store.reviews = [];
      const newReview = {
        id: Date.now(),
        toy_id: Number(toy_id),
        user_email: storedIdentifier,
        user_name: cleanName,
        rating: numRating,
        comment: cleanComment,
        status: 'approved',
        created_at: new Date().toISOString()
      };
      store.reviews.unshift(newReview);
      writeLocalStore(store);
      return res.status(201).json(newReview);
    }
  } catch (err) {
    console.error('Submit public review error:', err);
    res.status(500).json({ error: 'Failed to submit review: ' + err.message });
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
        [parseInt(toy_id, 10) || 0, userEmail.toLowerCase().trim()]
      );
      if (revCheck.rows.length > 0) {
        return res.status(400).json({ error: 'You have already reviewed this toy.' });
      }

      const result = await pool.query(
        `INSERT INTO reviews (toy_id, user_email, user_name, rating, comment, status)
         VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING *`,
        [parseInt(toy_id, 10) || 0, userEmail.toLowerCase().trim(), userName, numRating, cleanComment]
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
