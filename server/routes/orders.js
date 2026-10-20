import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate readable Order Numbers like PN-94812
function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `PN-${random}`;
}

// POST /api/orders - Create new customer order (Checkout)
router.post('/', async (req, res) => {
  try {
    const { customer_name, phone, address, city, pincode, payment_method, items, total_amount } = req.body;

    if (!customer_name || !phone || !address || !city || !pincode || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide all delivery details and at least one item.' });
    }

    const orderNumber = generateOrderNumber();
    const finalPaymentMethod = payment_method || 'COD';
    const numTotal = parseFloat(total_amount);

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO orders (order_number, customer_name, phone, address, city, pincode, payment_method, total_amount, status, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [orderNumber, customer_name.trim(), phone.trim(), address.trim(), city.trim(), pincode.trim(), finalPaymentMethod, numTotal, 'Pending', JSON.stringify(items)]
      );
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
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        payment_method: finalPaymentMethod,
        total_amount: numTotal,
        status: 'Pending',
        items: items,
        created_at: new Date().toISOString()
      };
      store.orders.unshift(newOrder);
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

// GET /api/orders - Admin: View all orders
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

// PATCH /api/orders/:id/status - Admin: Update status
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

// GET /api/orders/stats - Admin Dashboard metrics
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

export default router;
