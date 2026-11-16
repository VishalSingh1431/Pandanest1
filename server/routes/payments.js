import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import rateLimit from 'express-rate-limit';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { optionalUser } from '../middleware/auth.js';
import { sendOrderEmails } from '../email.js';

const router = express.Router();

// Strict rate limiters for payment creation & verification to prevent brute force / DoS
const paymentCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 orders per 15 min per IP
  message: { error: 'Too many order requests created. Please try again after a few minutes.' }
});

const paymentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 verification attempts per 15 min per IP
  message: { error: 'Too many payment verification attempts. Please contact support.' }
});

// Helper to generate readable Order Numbers like PN-94812
export function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `PN-${random}`;
}

// Indian mobile regex
const PHONE_REGEX = /^[6-9]\d{9}$/;
export function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
}

// Initialize Razorpay SDK instance lazily with active environment keys
export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.trim() === '' || keySecret.trim() === '') {
    return null;
  }

  return new Razorpay({
    key_id: keyId.trim(),
    key_secret: keySecret.trim()
  });
}

/**
 * Pure calculation logic: recalculates order totals strictly on the server side
 * Prevents client-side price modification attacks.
 */
export function calculateOrderTotal({ items, coupon, points_used = 0, user_balance = 0, dbToys = [], dbBooks = [] }) {
  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const qty = Math.max(1, parseInt(item.quantity || 1, 10));

    if (item.is_book || item.game_key) {
      // Activity book lookup
      const book = dbBooks.find(b => b.game_key === item.game_key);
      const unitPrice = book ? parseFloat(book.price) : 9.00;
      subtotal += unitPrice * qty;
      verifiedItems.push({
        ...item,
        price: unitPrice,
        quantity: qty,
        name: book?.title || item.name || 'Activity Book'
      });
    } else {
      // Toy lookup
      const toy = dbToys.find(t => String(t.id) === String(item.id));
      if (!toy) {
        throw new Error(`Toy with ID "${item.id}" is not available in our catalog.`);
      }

      // Check for flash sale pricing
      let unitPrice = parseFloat(toy.price);
      if (toy.is_todays_sale) {
        unitPrice = toy.todays_sale_price ? parseFloat(toy.todays_sale_price) : Math.round(unitPrice * 0.65);
      }

      subtotal += unitPrice * qty;
      verifiedItems.push({
        ...item,
        id: toy.id,
        name: toy.name,
        price: unitPrice,
        image_url: toy.image_url,
        quantity: qty
      });
    }
  }

  // Calculate Coupon discount
  let couponDiscount = 0;
  let appliedCouponCode = null;
  if (coupon && coupon.is_active) {
    if (subtotal >= parseFloat(coupon.min_order_amount || 0)) {
      if (coupon.discount_type === 'percentage') {
        const rawDiscount = (subtotal * parseFloat(coupon.discount_value)) / 100;
        const maxDisc = coupon.max_discount ? parseFloat(coupon.max_discount) : Infinity;
        couponDiscount = Math.min(rawDiscount, maxDisc);
      } else {
        // Flat discount
        couponDiscount = parseFloat(coupon.discount_value || 0);
      }
      couponDiscount = Math.min(couponDiscount, subtotal);
      appliedCouponCode = coupon.code;
    }
  }

  // Calculate Panda points discount (Max 300 points = ₹30 discount; 10 points = ₹1)
  const MAX_REDEEM_POINTS = 300;
  const usablePoints = Math.min(
    Math.max(0, parseInt(points_used || 0, 10)),
    MAX_REDEEM_POINTS,
    Math.max(0, parseInt(user_balance || 0, 10))
  );
  const pointsDiscount = Math.floor(usablePoints / 10);

  // Final total after all validated discounts (at least ₹1)
  const discountedTotal = Math.max(1, Math.round(subtotal - couponDiscount - pointsDiscount));
  const amountInPaise = discountedTotal * 100;

  return {
    subtotal: Math.round(subtotal),
    couponDiscount: Math.round(couponDiscount),
    pointsDiscount,
    pointsUsed: usablePoints,
    finalTotal: discountedTotal,
    amountInPaise,
    appliedCouponCode,
    verifiedItems
  };
}

/**
 * Timing-safe HMAC-SHA256 signature verification
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const clientBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== clientBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, clientBuf);
  } catch (err) {
    console.error('Cryptographic signature check error:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/payments/create-order — Creates Razorpay Order with Zero-Trust Amount
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', paymentCreateLimiter, optionalUser, async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      email,
      address,
      city,
      pincode,
      items,
      coupon_code,
      points_used
    } = req.body;

    if (!customer_name || !phone || !address || !city || !pincode || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide full delivery details and at least one item.' });
    }

    const cleanPhone = normalizePhone(phone);
    if (!PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const userEmail = req.user?.email
      ? req.user.email.toLowerCase().trim()
      : (email && email.trim().length > 0 ? email.toLowerCase().trim() : null);

    const { isPostgres, pool } = getDB();

    // 1. Fetch live DB catalog to compute server-side verified price
    let dbToys = [];
    let dbBooks = [];
    let dbCoupon = null;
    let userBalance = 0;

    if (isPostgres && pool) {
      const toysRes = await pool.query('SELECT * FROM toys');
      dbToys = toysRes.rows;

      const booksRes = await pool.query('SELECT * FROM game_books');
      dbBooks = booksRes.rows;

      if (coupon_code) {
        const couponRes = await pool.query(
          'SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true',
          [String(coupon_code).trim().toUpperCase()]
        );
        dbCoupon = couponRes.rows[0] || null;
      }

      if (userEmail) {
        const userRes = await pool.query(
          'SELECT panda_points FROM users WHERE LOWER(email) = $1',
          [userEmail]
        );
        if (userRes.rows.length > 0) {
          userBalance = parseInt(userRes.rows[0].panda_points || 0, 10);
        }
      }
    } else {
      const store = readLocalStore();
      dbToys = store.toys || [];
      dbBooks = store.game_books || [];
      if (coupon_code) {
        dbCoupon = (store.coupons || []).find(
          c => c.code.toUpperCase() === String(coupon_code).trim().toUpperCase() && c.is_active
        );
      }
      if (userEmail) {
        const u = (store.users || []).find(u => u.email.toLowerCase() === userEmail);
        userBalance = parseInt(u?.panda_points || 0, 10);
      }
    }

    // 2. Strict Zero Client Trust Calculation
    const pricing = calculateOrderTotal({
      items,
      coupon: dbCoupon,
      points_used,
      user_balance: userBalance,
      dbToys,
      dbBooks
    });

    const orderNumber = generateOrderNumber();

    // 3. Create Order on Razorpay
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(503).json({
        error: 'Razorpay keys are not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env',
        code: 'RAZORPAY_NOT_CONFIGURED'
      });
    }

    const rzpOrder = await razorpay.orders.create({
      amount: pricing.amountInPaise,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        customer_phone: cleanPhone,
        customer_email: userEmail || ''
      }
    });

    // 4. Save pending order in database
    if (isPostgres && pool) {
      await pool.query(
        `INSERT INTO orders (
          order_number, customer_name, phone, address, city, pincode,
          payment_method, payment_status, razorpay_order_id, currency,
          total_amount, status, items, user_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          orderNumber,
          customer_name.trim(),
          cleanPhone,
          address.trim(),
          city.trim(),
          pincode.trim(),
          'Razorpay',
          'pending',
          rzpOrder.id,
          'INR',
          pricing.finalTotal,
          'Pending',
          JSON.stringify(pricing.verifiedItems),
          userEmail
        ]
      );
    } else {
      const store = readLocalStore();
      if (!store.orders) store.orders = [];
      store.orders.push({
        id: Date.now(),
        order_number: orderNumber,
        customer_name: customer_name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        payment_method: 'Razorpay',
        payment_status: 'pending',
        razorpay_order_id: rzpOrder.id,
        currency: 'INR',
        total_amount: pricing.finalTotal,
        status: 'Pending',
        items: pricing.verifiedItems,
        user_email: userEmail,
        created_at: new Date().toISOString()
      });
      writeLocalStore(store);
    }

    return res.status(201).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      order_number: orderNumber,
      total_amount: pricing.finalTotal,
      points_used: pricing.pointsUsed,
      coupon_discount: pricing.couponDiscount
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err);
    res.status(500).json({ error: err.message || 'Failed to initialize payment order.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/payments/verify — Bank-Grade Verification & Post-Payment Fulfilment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', paymentVerifyLimiter, optionalUser, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Server payment configuration missing secret key.' });
    }

    // 1. Cryptographic HMAC-SHA256 signature check (Timing-Safe)
    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      secret: keySecret
    });

    if (!isSignatureValid) {
      console.warn(`🚨 Signature forgery attempt detected! Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);
      return res.status(400).json({
        success: false,
        error: 'Cryptographic signature mismatch! Payment tampering detected.'
      });
    }

    const { isPostgres, pool } = getDB();

    // 2. Replay attack check: Ensure this razorpay_payment_id hasn't been used on any other order
    if (isPostgres && pool) {
      const dupCheck = await pool.query(
        'SELECT id, order_number, payment_status FROM orders WHERE razorpay_payment_id = $1 AND razorpay_order_id != $2',
        [razorpay_payment_id, razorpay_order_id]
      );
      if (dupCheck.rows.length > 0) {
        console.warn(`🚨 Replay attack blocked: payment ${razorpay_payment_id} already consumed on order ${dupCheck.rows[0].order_number}`);
        return res.status(409).json({ error: 'Duplicate payment detected. This payment has already been credited.' });
      }
    }

    // 3. Confirm payment status with Razorpay API
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay client is unavailable.' });
    }

    const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!rzpPayment || (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized')) {
      return res.status(400).json({
        error: `Payment is not in an authorized or captured state (Status: ${rzpPayment?.status || 'unknown'}).`
      });
    }

    // 4. Update order to Confirmed & Paid
    let confirmedOrder = null;

    if (isPostgres && pool) {
      const updateRes = await pool.query(
        `UPDATE orders
         SET payment_status = 'paid',
             status = 'Confirmed',
             razorpay_payment_id = $1,
             razorpay_signature = $2,
             payment_verified_at = CURRENT_TIMESTAMP
         WHERE razorpay_order_id = $3
         RETURNING *`,
        [razorpay_payment_id, razorpay_signature, razorpay_order_id]
      );

      confirmedOrder = updateRes.rows[0];

      if (confirmedOrder) {
        // Parse items
        let orderItems = [];
        try {
          orderItems = typeof confirmedOrder.items === 'string'
            ? JSON.parse(confirmedOrder.items)
            : (confirmedOrder.items || []);
        } catch (_) {
          orderItems = [];
        }

        // Decrement inventory stock
        for (const it of orderItems) {
          if (it.id && !it.is_book) {
            await pool.query(
              'UPDATE toys SET stock = GREATEST(0, COALESCE(stock, 10) - $1) WHERE id = $2',
              [it.quantity || 1, it.id]
            );
          }
        }

        // Deduct panda points if user redeemed any
        if (confirmedOrder.user_email) {
          // Send order confirmation email
          sendOrderEmails({
            order: confirmedOrder,
            items: orderItems,
            customerName: confirmedOrder.customer_name,
            customerEmail: confirmedOrder.user_email,
            phone: confirmedOrder.phone,
            address: confirmedOrder.address,
            city: confirmedOrder.city,
            pincode: confirmedOrder.pincode,
            totalAmount: confirmedOrder.total_amount,
            paymentMethod: 'Razorpay (Online Paid)'
          }).catch(e => console.warn('Payment verified email notification notice:', e.message));
        }
      }
    } else {
      const store = readLocalStore();
      const order = (store.orders || []).find(o => o.razorpay_order_id === razorpay_order_id);
      if (order) {
        order.payment_status = 'paid';
        order.status = 'Confirmed';
        order.razorpay_payment_id = razorpay_payment_id;
        order.razorpay_signature = razorpay_signature;
        order.payment_verified_at = new Date().toISOString();
        writeLocalStore(store);
        confirmedOrder = order;

        sendOrderEmails({
          order: confirmedOrder,
          items: order.items || [],
          customerName: order.customer_name,
          customerEmail: order.user_email,
          phone: order.phone,
          address: order.address,
          city: order.city,
          pincode: order.pincode,
          totalAmount: order.total_amount,
          paymentMethod: 'Razorpay (Online Paid)'
        }).catch(e => console.warn('Payment email notice:', e.message));
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified and order confirmed successfully! 🎉',
      order: confirmedOrder,
      order_number: confirmedOrder?.order_number || order_number
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/payments/webhook — Asynchronous Server-to-Server Fallback
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (expected !== signature) {
        console.warn('⚠️ Webhook signature mismatch rejected');
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId && rzpPaymentId) {
        const { isPostgres, pool } = getDB();
        if (isPostgres && pool) {
          await pool.query(
            `UPDATE orders
             SET payment_status = 'paid',
                 status = 'Confirmed',
                 razorpay_payment_id = $1,
                 payment_verified_at = CURRENT_TIMESTAMP
             WHERE razorpay_order_id = $2 AND payment_status != 'paid'`,
            [rzpPaymentId, rzpOrderId]
          );
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

export default router;
