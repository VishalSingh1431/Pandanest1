import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin, authenticateUser, optionalUser } from '../middleware/auth.js';
import { sendOrderEmails } from '../email.js';

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

// GET /api/orders/export/csv — Admin: Export all orders as Excel-compatible CSV file
router.get('/export/csv', authenticateAdmin, async (req, res) => {
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

    // Prepare CSV Header and Rows
    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Delivery Address',
      'City',
      'Pincode',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Courier Name',
      'Tracking Number',
      'Total Amount (INR)',
      'Items Summary'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((o) => {
      let itemsList = [];
      try {
        itemsList = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      } catch {
        itemsList = [];
      }
      const itemsSummary = itemsList
        .map((it) => `${it.name || 'Item'} (x${it.quantity || 1})`)
        .join('; ');

      const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '';

      return [
        escapeCsv(o.order_number),
        escapeCsv(dateStr),
        escapeCsv(o.customer_name),
        escapeCsv(o.phone),
        escapeCsv(o.user_email || o.email || ''),
        escapeCsv(o.address),
        escapeCsv(o.city),
        escapeCsv(o.pincode),
        escapeCsv(o.payment_method),
        escapeCsv(o.payment_status || 'pending'),
        escapeCsv(o.status),
        escapeCsv(o.courier_name || 'Delhivery / Shiprocket'),
        escapeCsv(o.tracking_number || ''),
        escapeCsv(o.total_amount),
        escapeCsv(itemsSummary)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const filename = `pandanest_orders_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export CSV orders error:', err);
    res.status(500).json({ error: 'Failed to export orders.' });
  }
});

// GET /api/orders/track/:orderQuery — Public/Customer order tracking by order_number or ID
router.get('/track/:orderQuery', async (req, res) => {
  try {
    const rawQuery = String(req.params.orderQuery || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ error: 'Order number or ID is required.' });
    }

    const { isPostgres, pool } = getDB();
    let order = null;

    if (isPostgres && pool) {
      const result = await pool.query(
        `SELECT id, order_number, customer_name, phone, address, city, pincode, 
                payment_method, payment_status, total_amount, status, items, 
                courier_name, tracking_number, tracking_url, created_at, updated_at
         FROM orders 
         WHERE UPPER(order_number) = UPPER($1) OR id::text = $1
         LIMIT 1`,
        [rawQuery]
      );
      if (result.rows.length > 0) order = result.rows[0];
    } else {
      const store = readLocalStore();
      order = (store.orders || []).find(
        o => String(o.order_number || '').toUpperCase() === rawQuery.toUpperCase() || String(o.id) === rawQuery
      );
    }

    if (!order) {
      return res.status(404).json({ error: `Order '${rawQuery}' not found. Please verify your order number.` });
    }

    // Parse items safely
    let items = [];
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    } catch {
      items = [];
    }

    // Compute progress timeline step (1 = Placed, 2 = Confirmed, 3 = Dispatched, 4 = Delivered)
    const statusMap = {
      Pending: 1,
      Confirmed: 2,
      Dispatched: 3,
      Delivered: 4,
      Cancelled: -1
    };

    const currentStep = statusMap[order.status] ?? 1;

    // Delivery estimate: 3 to 5 days from creation
    const orderDate = new Date(order.created_at || Date.now());
    const minDelivery = new Date(orderDate);
    minDelivery.setDate(orderDate.getDate() + 3);
    const maxDelivery = new Date(orderDate);
    maxDelivery.setDate(orderDate.getDate() + 5);

    const deliveryEstimate = `${minDelivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${maxDelivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

    // Mask phone for privacy in public lookup (e.g. 98****3210)
    const phoneStr = String(order.phone || '');
    const maskedPhone = phoneStr.length >= 10
      ? `${phoneStr.slice(0, 2)}******${phoneStr.slice(-2)}`
      : phoneStr;

    return res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        masked_phone: maskedPhone,
        address: order.address,
        city: order.city,
        pincode: order.pincode,
        payment_method: order.payment_method,
        payment_status: order.payment_status || (order.payment_method === 'COD' ? 'Pending' : 'paid'),
        status: order.status,
        current_step: currentStep,
        total_amount: order.total_amount,
        items,
        courier_name: order.courier_name || 'BlueDart / Delhivery Express',
        tracking_number: order.tracking_number || `PN-EXP-${order.order_number.replace(/\D/g, '') || '88392'}`,
        tracking_url: order.tracking_url || 'https://www.delhivery.com/tracking',
        created_at: order.created_at,
        delivery_estimate: deliveryEstimate
      }
    });
  } catch (err) {
    console.error('Order tracking error:', err);
    res.status(500).json({ error: 'Failed to retrieve order tracking information.' });
  }
});

// GET /api/orders/pincode/:pincode — Auto-detect City, District & State from 6-digit Indian PIN code
router.get('/pincode/:pincode', async (req, res) => {
  try {
    const rawPin = String(req.params.pincode || '').replace(/\D/g, '');
    if (rawPin.length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://api.postalpincode.in/pincode/${rawPin}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: 'Pincode service temporarily unavailable.' });
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
      const po = data[0].PostOffice[0];
      const district = po.District || '';
      const state = po.State || '';
      const area = po.Name || '';
      const cityFormatted = district && state ? (district.toLowerCase() === state.toLowerCase() ? district : `${district}, ${state}`) : (district || state || area);

      return res.json({
        success: true,
        pincode: rawPin,
        district,
        state,
        area,
        city: cityFormatted
      });
    }

    return res.status(404).json({ success: false, error: 'Pincode not found.' });
  } catch (err) {
    console.warn('Pincode lookup failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to look up pincode.' });
  }
});

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
      const ordersRes = await pool.query('SELECT total_amount, status, payment_status, created_at FROM orders');
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

    // Strictly count verified paid revenue (exclude abandoned / unpaid checkouts)
    const paidOrders = orders.filter(o => o.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(o.status));
    const totalOrders = orders.length;
    const paidOrdersCount = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending' && o.payment_status !== 'paid').length;

    res.json({
      totalOrders,
      paidOrdersCount,
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
    const { customer_name, phone, email, address, city, pincode, payment_method, items, total_amount, points_used } = req.body;

    if (!customer_name || !phone || !address || !city || !pincode || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide all delivery details and at least one item.' });
    }

    // Validate phone number format (10-digit Indian mobile)
    const cleanPhone = normalizePhone(phone);
    if (!PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const orderNumber = generateOrderNumber();
    const finalPaymentMethod = (!payment_method || payment_method === 'COD') ? 'Online' : payment_method;
    const numTotal = parseFloat(total_amount);
    
    // STRICT RULE: User can redeem up to 300 Panda Coins at max per order (300 coins = ₹30 discount)
    const MAX_REDEEM_POINTS = 300;
    const requestedPoints = Math.max(0, parseInt(points_used || 0, 10));
    const numPointsUsed = Math.min(requestedPoints, MAX_REDEEM_POINTS);

    // Capture the logged-in user's email or the email provided in checkout
    const userEmail = req.user?.email
      ? req.user.email.toLowerCase().trim()
      : (email && email.trim().length > 0 ? email.toLowerCase().trim() : null);

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
          `INSERT INTO users (email, name, panda_points, role)
           VALUES ($1, $2, 100, 'user')
           ON CONFLICT (email) DO NOTHING`,
          [userEmail, customer_name.trim()]
        );
        await pool.query(
          'UPDATE users SET panda_points = GREATEST(0, COALESCE(panda_points, 0) - $1) WHERE LOWER(email) = $2',
          [numPointsUsed, userEmail]
        );
      }

      const createdOrder = result.rows[0];

      // Dispatch order confirmation email to customer + sales alert to admin in background
      sendOrderEmails({
        order: createdOrder,
        items,
        customerName: customer_name.trim(),
        customerEmail: userEmail,
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        totalAmount: numTotal,
        paymentMethod: finalPaymentMethod
      }).catch((e) => console.warn('Order email trigger notice:', e.message));

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Thank you for shopping with Pandanest.',
        order: createdOrder
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

      // Dispatch order confirmation email to customer + sales alert to admin in background
      sendOrderEmails({
        order: newOrder,
        items,
        customerName: customer_name.trim(),
        customerEmail: userEmail,
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        totalAmount: numTotal,
        paymentMethod: finalPaymentMethod
      }).catch((e) => console.warn('Order email trigger notice:', e.message));

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
      // Fetch current order to check previous status
      const curRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (curRes.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
      const previousOrder = curRes.rows[0];

      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      const updatedOrder = result.rows[0];

      // Restock inventory if an order is cancelled
      if (status === 'Cancelled' && previousOrder.status !== 'Cancelled') {
        let items = [];
        try {
          items = typeof previousOrder.items === 'string' ? JSON.parse(previousOrder.items) : (previousOrder.items || []);
        } catch {
          items = [];
        }
        for (const it of items) {
          if (it.id && !it.is_book) {
            await pool.query(
              'UPDATE toys SET stock = COALESCE(stock, 0) + $1 WHERE id = $2',
              [parseInt(it.quantity || 1, 10), parseInt(it.id, 10)]
            );
          }
        }
      } else if (previousOrder.status === 'Cancelled' && status !== 'Cancelled') {
        // Re-decrement inventory if order is restored from Cancelled
        let items = [];
        try {
          items = typeof previousOrder.items === 'string' ? JSON.parse(previousOrder.items) : (previousOrder.items || []);
        } catch {
          items = [];
        }
        for (const it of items) {
          if (it.id && !it.is_book) {
            await pool.query(
              'UPDATE toys SET stock = GREATEST(0, COALESCE(stock, 0) - $1) WHERE id = $2',
              [parseInt(it.quantity || 1, 10), parseInt(it.id, 10)]
            );
          }
        }
      }

      return res.json(updatedOrder);
    } else {
      const store = readLocalStore();
      const order = (store.orders || []).find(o => String(o.id) === String(id));
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      const prevStatus = order.status;
      order.status = status;

      // Restock inventory if cancelled in local store
      if (status === 'Cancelled' && prevStatus !== 'Cancelled') {
        const items = order.items || [];
        for (const it of items) {
          if (it.id && !it.is_book) {
            const toy = (store.toys || []).find(t => String(t.id) === String(it.id));
            if (toy) {
              toy.stock = (toy.stock || 0) + parseInt(it.quantity || 1, 10);
            }
          }
        }
      } else if (prevStatus === 'Cancelled' && status !== 'Cancelled') {
        // Re-decrement stock if restored from Cancelled
        const items = order.items || [];
        for (const it of items) {
          if (it.id && !it.is_book) {
            const toy = (store.toys || []).find(t => String(t.id) === String(it.id));
            if (toy) {
              toy.stock = Math.max(0, (toy.stock || 0) - parseInt(it.quantity || 1, 10));
            }
          }
        }
      }

      writeLocalStore(store);
      return res.json(order);
    }
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// DELETE /api/orders/:id — Admin: Delete an order record (e.g. spam/test orders)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      const order = orderRes.rows[0];

      // If active order was deleted, restock items
      if (order.status !== 'Cancelled') {
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        } catch {
          items = [];
        }
        for (const it of items) {
          if (it.id && !it.is_book) {
            await pool.query(
              'UPDATE toys SET stock = COALESCE(stock, 0) + $1 WHERE id = $2',
              [parseInt(it.quantity || 1, 10), parseInt(it.id, 10)]
            );
          }
        }
      }

      await pool.query('DELETE FROM orders WHERE id = $1', [id]);
      return res.json({ success: true, message: `Order ${order.order_number} deleted.` });
    } else {
      const store = readLocalStore();
      const orderIdx = (store.orders || []).findIndex(o => String(o.id) === String(id));
      if (orderIdx === -1) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const order = store.orders[orderIdx];
      // Restock if active
      if (order.status !== 'Cancelled') {
        const items = order.items || [];
        for (const it of items) {
          if (it.id && !it.is_book) {
            const toy = (store.toys || []).find(t => String(t.id) === String(it.id));
            if (toy) {
              toy.stock = (toy.stock || 0) + parseInt(it.quantity || 1, 10);
            }
          }
        }
      }

      store.orders.splice(orderIdx, 1);
      writeLocalStore(store);
      return res.json({ success: true, message: `Order ${order.order_number} deleted.` });
    }
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order.' });
  }
});

export default router;
