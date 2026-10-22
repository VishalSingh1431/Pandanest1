import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin, authenticateUser, optionalUser } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate readable Order Numbers like PN-94812
function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `PN-${random}`;
}

// Phone validation — 10-digit Indian mobile number
const PHONE_REGEX = /^[6-9]\d{9}$/;
function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
}

// ─────────────────────────────────────────────────────────
// IMPORTANT: Named routes MUST be declared before /:id routes
// ─────────────────────────────────────────────────────────

// GET /api/orders/my-orders — Customer: View personal orders (uses user_email from JWT)
router.get('/my-orders', authenticateUser, async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const { isPostgres, pool } = getDB();
    let orders = [];

    if (isPostgres && pool) {
      const result = await pool.query(
        `SELECT * FROM orders WHERE user_email = $1 ORDER BY created_at DESC`,
        [userEmail]
      );
      orders = result.rows;
    } else {
      const store = readLocalStore();
      orders = (store.orders || []).filter(o => o.user_email === userEmail);
    }

    res.json(orders);
  } catch (err) {
    console.error('Fetch personal orders error:', err);
    res.status(500).json({ error: 'Failed to fetch personal orders.' });
  }
});

// GET /api/orders/stats — Admin Dashboard metrics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    let orders = [];
    let toysCount = 0;
    let leadsCount = 0;

    if (isPostgres && pool) {
      const ordersRes = await pool.query('SELECT total_amount, status FROM orders');
      orders = ordersRes.rows;
      const toysRes = await pool.query('SELECT COUNT(*) as count FROM toys');
      toysCount = parseInt(toysRes.rows[0].count, 10);
      const leadsRes = await pool.query('SELECT COUNT(*) as count FROM leads');
      leadsCount = parseInt(leadsRes.rows[0].count, 10);
    } else {
      const store = readLocalStore();
      orders = store.orders || [];
      toysCount = (store.toys || []).length;
      leadsCount = (store.leads || []).length;
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;

    res.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
      totalToys: toysCount,
      totalLeads: leadsCount
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard stats.' });
  }
});

// GET /api/orders — Admin: View all orders
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    let orders = [];

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      orders = result.rows;
    } else {
      const store = readLocalStore();
      orders = store.orders || [];
    }

    res.json(orders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// POST /api/orders — Create new customer order (Checkout)
router.post('/', optionalUser, async (req, res) => {
  try {
    const { customer_name, phone, address, city, pincode, payment_method, items, total_amount, points_used } = req.body;

    if (!customer_name || !phone || !address || !city || !pincode || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide all delivery details and at least one item.' });
    }

    // Validate phone number format (10-digit Indian mobile)
    const cleanPhone = normalizePhone(phone);
    if (!PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const orderNumber = generateOrderNumber();
    const finalPaymentMethod = payment_method || 'COD';
    const numTotal = parseFloat(total_amount);
    
    // STRICT RULE: User can redeem up to 300 Panda Points at max per order (300 points = ₹30 discount)
    const MAX_REDEEM_POINTS = 300;
    const requestedPoints = parseInt(points_used || 0, 10);
    const numPointsUsed = Math.min(requestedPoints, MAX_REDEEM_POINTS);

    // Capture the logged-in user's email for order ownership (optional — guest checkout allowed)
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO orders (order_number, customer_name, phone, address, city, pincode, payment_method, total_amount, status, items, user_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [orderNumber, customer_name.trim(), cleanPhone, address.trim(), city.trim(), pincode.trim(), finalPaymentMethod, numTotal, 'Pending', JSON.stringify(items), userEmail]
      );

      // Deduct panda points server-side if used
      if (numPointsUsed > 0 && userEmail) {
        await pool.query(
          'UPDATE users SET panda_points = GREATEST(0, panda_points - $1) WHERE email = $2',
          [numPointsUsed, userEmail]
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Thank you for shopping with Pandanest.',
        order: result.rows[0]
      });
    } else {
      const store = readLocalStore();
      const newOrder = {
        id: Date.now(),
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        payment_method: finalPaymentMethod,
        total_amount: numTotal,
        status: 'Pending',
        items: items,
        user_email: userEmail,
        created_at: new Date().toISOString()
      };
      store.orders.unshift(newOrder);

      // Deduct panda points server-side if used
      if (numPointsUsed > 0 && userEmail) {
        store.users = store.users || [];
        const user = store.users.find(u => u.email === userEmail);
        if (user) user.panda_points = Math.max(0, (user.panda_points || 0) - numPointsUsed);
      }

      writeLocalStore(store);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Thank you for shopping with Pandanest.',
        order: newOrder
      });
    }
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// PATCH /api/orders/:id/status — Admin: Update status
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      const order = store.orders.find(o => String(o.id) === String(id));
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      order.status = status;
      writeLocalStore(store);
      return res.json(order);
    }
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

export default router;
