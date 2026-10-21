import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/coupons/validate - Public / Shopper checkout validation
router.post('/validate', async (req, res) => {
  try {
    const { code, order_amount } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Please enter a coupon code.' });
    }
    const cleanCode = code.trim().toUpperCase();
    const amount = Number(order_amount) || 0;
    const { isPostgres, pool } = getDB();

    let coupon = null;

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM coupons WHERE UPPER(code) = $1', [cleanCode]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid coupon code.' });
      }
      coupon = result.rows[0];
    } else {
      const store = readLocalStore();
      coupon = (store.coupons || []).find(c => c.code.toUpperCase() === cleanCode);
      if (!coupon) {
        return res.status(404).json({ error: 'Invalid coupon code.' });
      }
    }

    if (!coupon.is_active) {
      return res.status(400).json({ error: 'This coupon is no longer active.' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired.' });
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This coupon has reached its maximum usage limit.' });
    }

    const minAmount = Number(coupon.min_order_amount) || 0;
    if (amount < minAmount) {
      return res.status(400).json({
        error: `Minimum order amount of ₹${minAmount} is required to apply ${coupon.code}.`
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (amount * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount && discount > Number(coupon.max_discount)) {
        discount = Number(coupon.max_discount);
      }
    } else {
      // flat discount
      discount = Number(coupon.discount_value);
    }

    // Discount cannot exceed order amount
    discount = Math.min(discount, amount);
    discount = Math.round(discount);

    return res.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_amount: discount,
      message: `Coupon ${coupon.code} applied successfully! You save ₹${discount}.`
    });
  } catch (err) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ error: 'Failed to validate coupon: ' + err.message });
  }
});

// GET /api/coupons - Admin: List all coupons
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
      return res.json(result.rows);
    } else {
      const store = readLocalStore();
      const coupons = (store.coupons || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(coupons);
    }
  } catch (err) {
    console.error('Fetch coupons error:', err);
    res.status(500).json({ error: 'Failed to fetch coupons.' });
  }
});

// POST /api/coupons - Admin: Create new coupon
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_discount, expires_at, usage_limit } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Coupon code is required.' });
    }
    if (!discount_value || Number(discount_value) <= 0) {
      return res.status(400).json({ error: 'A positive discount value is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const type = discount_type === 'flat' ? 'flat' : 'percentage';
    const val = Number(discount_value);
    const minOrder = Number(min_order_amount) || 0;
    const maxDisc = max_discount ? Number(max_discount) : null;
    const expiry = expires_at ? new Date(expires_at).toISOString() : null;
    const limit = usage_limit ? parseInt(usage_limit, 10) : 100;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const existing = await pool.query('SELECT id FROM coupons WHERE UPPER(code) = $1', [cleanCode]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Coupon with this code already exists.' });
      }
      const result = await pool.query(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, expires_at, usage_limit, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
        [cleanCode, type, val, minOrder, maxDisc, expiry, limit]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.coupons) store.coupons = [];
      const exists = store.coupons.some(c => c.code.toUpperCase() === cleanCode);
      if (exists) {
        return res.status(400).json({ error: 'Coupon with this code already exists.' });
      }
      const newCoupon = {
        id: Date.now(),
        code: cleanCode,
        discount_type: type,
        discount_value: val,
        min_order_amount: minOrder,
        max_discount: maxDisc,
        expires_at: expiry,
        usage_limit: limit,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      store.coupons.push(newCoupon);
      writeLocalStore(store);
      return res.status(201).json(newCoupon);
    }
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon: ' + err.message });
  }
});

// PATCH /api/coupons/:id/toggle - Admin: Toggle active state
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        'UPDATE coupons SET is_active = NOT is_active WHERE id = $1 RETURNING *',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Coupon not found.' });
      }
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.coupons) store.coupons = [];
      const coupon = store.coupons.find(c => String(c.id) === String(id));
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found.' });
      }
      coupon.is_active = !coupon.is_active;
      writeLocalStore(store);
      return res.json(coupon);
    }
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ error: 'Failed to toggle coupon.' });
  }
});

// DELETE /api/coupons/:id - Admin: Delete coupon
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Coupon not found.' });
      }
    } else {
      const store = readLocalStore();
      if (!store.coupons) store.coupons = [];
      const before = store.coupons.length;
      store.coupons = store.coupons.filter(c => String(c.id) !== String(id));
      if (store.coupons.length === before) {
        return res.status(404).json({ error: 'Coupon not found.' });
      }
      writeLocalStore(store);
    }
    return res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
});

export default router;
