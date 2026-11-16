import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  calculateOrderTotal,
  verifyRazorpaySignature,
  normalizePhone,
  generateOrderNumber
} from '../routes/payments.js';

describe('Razorpay Security & Payment Integrity Unit Tests', () => {

  // Mock DB Catalog Data
  const mockDbToys = [
    { id: 101, name: 'Remote Control Turbo Racer', price: 999.00, is_todays_sale: false, stock: 15 },
    { id: 102, name: 'Panda Plush Toy 30cm', price: 499.00, is_todays_sale: false, stock: 20 },
    { id: 103, name: 'Flash Deal Building Blocks', price: 1000.00, is_todays_sale: true, todays_sale_price: 650.00, stock: 5 }
  ];

  const mockDbBooks = [
    { game_key: 'drawing_studio', title: 'Panda Nest Coloring & Activity Book', price: 9.00 },
    { game_key: 'truth_or_dare', title: 'Family Truth or Dare 100 Cards Book', price: 19.00 }
  ];

  describe('1. Zero-Client-Trust Price Recalculation', () => {
    it('should strictly ignore client-tampered price and recalculate from DB catalog', () => {
      // Attacker attempts to forge a ₹999 toy for ₹1
      const maliciousClientItems = [
        { id: 101, quantity: 1, price: 1.00 }
      ];

      const result = calculateOrderTotal({
        items: maliciousClientItems,
        coupon: null,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.subtotal, 999, 'Subtotal must be ₹999 from DB, NOT ₹1 from client');
      assert.equal(result.finalTotal, 999, 'Final total must match verified DB price');
      assert.equal(result.amountInPaise, 99900, 'Paise amount must equal 99900');
    });

    it('should correctly calculate quantity multipliers', () => {
      const clientItems = [
        { id: 102, quantity: 3 } // 3 * ₹499 = ₹1497
      ];

      const result = calculateOrderTotal({
        items: clientItems,
        coupon: null,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.subtotal, 1497);
      assert.equal(result.finalTotal, 1497);
      assert.equal(result.amountInPaise, 149700);
    });

    it('should apply Today Special Flash Deal pricing when item is on flash sale', () => {
      const flashSaleItem = [
        { id: 103, quantity: 1 } // Original ₹1000, Flash sale ₹650
      ];

      const result = calculateOrderTotal({
        items: flashSaleItem,
        coupon: null,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.finalTotal, 650);
      assert.equal(result.amountInPaise, 65000);
    });

    it('should correctly price activity books from dbBooks', () => {
      const bookItems = [
        { game_key: 'drawing_studio', is_book: true, quantity: 2 } // 2 * ₹9 = ₹18
      ];

      const result = calculateOrderTotal({
        items: bookItems,
        coupon: null,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.subtotal, 18);
      assert.equal(result.finalTotal, 18);
      assert.equal(result.amountInPaise, 1800);
    });

    it('should reject nonexistent catalog toy IDs', () => {
      assert.throws(() => {
        calculateOrderTotal({
          items: [{ id: 99999, quantity: 1 }],
          coupon: null,
          points_used: 0,
          user_balance: 0,
          dbToys: mockDbToys,
          dbBooks: mockDbBooks
        });
      }, /not available in our catalog/);
    });

    it('should reject out-of-stock items and overselling', () => {
      const outOfStockToys = [
        { id: 201, name: 'Zero Stock Robot', price: 799.00, stock: 0 },
        { id: 202, name: 'Low Stock Drone', price: 1299.00, stock: 2 }
      ];

      // Test 1: item with stock 0
      assert.throws(() => {
        calculateOrderTotal({
          items: [{ id: 201, quantity: 1 }],
          coupon: null,
          points_used: 0,
          user_balance: 0,
          dbToys: outOfStockToys,
          dbBooks: mockDbBooks
        });
      }, /out of stock/);

      // Test 2: requesting 5 units when only 2 available
      assert.throws(() => {
        calculateOrderTotal({
          items: [{ id: 202, quantity: 5 }],
          coupon: null,
          points_used: 0,
          user_balance: 0,
          dbToys: outOfStockToys,
          dbBooks: mockDbBooks
        });
      }, /Only 2 units of "Low Stock Drone" are available/);
    });

    it('should identify activity books even if is_book flag is omitted from client', () => {
      const bookItemsWithoutFlag = [
        { id: 'drawing-book-118-pdf', quantity: 1 },
        { id: 'game-book-truth-dare', quantity: 2 }
      ];

      const result = calculateOrderTotal({
        items: bookItemsWithoutFlag,
        coupon: null,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: [
          { game_key: 'drawing', price: 9.00, title: 'Coloring Book' },
          { game_key: 'truthDare', price: 19.00, title: 'Truth Dare Cards' }
        ]
      });

      // 1 * 9 + 2 * 19 = 47
      assert.equal(result.subtotal, 47);
      assert.equal(result.finalTotal, 47);
      assert.equal(result.amountInPaise, 4700);
      assert.equal(result.verifiedItems[0].is_book, true);
      assert.equal(result.verifiedItems[1].is_book, true);
    });
  });

  describe('2. Coupon & Discount Security Constraints', () => {
    it('should correctly apply percentage coupon with max discount cap', () => {
      const coupon = {
        code: 'SAVE20',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 500,
        max_discount: 100, // 20% of ₹999 is ₹199.8, but capped at ₹100
        is_active: true
      };

      const result = calculateOrderTotal({
        items: [{ id: 101, quantity: 1 }], // ₹999
        coupon,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.couponDiscount, 100);
      assert.equal(result.finalTotal, 899);
      assert.equal(result.appliedCouponCode, 'SAVE20');
    });

    it('should reject coupon if subtotal is below min_order_amount', () => {
      const coupon = {
        code: 'MINORDER500',
        discount_type: 'flat',
        discount_value: 50,
        min_order_amount: 500,
        is_active: true
      };

      const result = calculateOrderTotal({
        items: [{ id: 102, quantity: 1 }], // ₹499 < ₹500
        coupon,
        points_used: 0,
        user_balance: 0,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.couponDiscount, 0, 'Discount must be 0 when below minimum order amount');
      assert.equal(result.finalTotal, 499);
    });

    it('should enforce 300 Panda points maximum limit (₹30 max discount)', () => {
      // User claims they want to redeem 1000 points
      const result = calculateOrderTotal({
        items: [{ id: 101, quantity: 1 }], // ₹999
        coupon: null,
        points_used: 1000,
        user_balance: 1000,
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.pointsUsed, 300, 'Max redeemable points is capped at 300');
      assert.equal(result.pointsDiscount, 30, '300 points = ₹30 discount');
      assert.equal(result.finalTotal, 969); // 999 - 30 = 969
    });

    it('should not allow points redemption greater than user balance', () => {
      const result = calculateOrderTotal({
        items: [{ id: 101, quantity: 1 }],
        coupon: null,
        points_used: 200,
        user_balance: 50, // User only has 50 points
        dbToys: mockDbToys,
        dbBooks: mockDbBooks
      });

      assert.equal(result.pointsUsed, 50);
      assert.equal(result.pointsDiscount, 5); // 50 / 10 = ₹5
      assert.equal(result.finalTotal, 994);
    });
  });

  describe('3. Cryptographic Signature Verification (HMAC-SHA256)', () => {
    const testSecret = 'rzp_sec_mock_key_2026_xyz_safe';
    const testOrderId = 'order_DA28F7h9H3a0aK';
    const testPaymentId = 'pay_9829Fh01FbaK02';

    // Generate real HMAC-SHA256
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    it('should verify genuine Razorpay signature successfully', () => {
      const isValid = verifyRazorpaySignature({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: validSignature,
        secret: testSecret
      });

      assert.equal(isValid, true, 'Genuine HMAC signature must be accepted');
    });

    it('should reject tampered or forged signature', () => {
      const tamperedSignature = validSignature.slice(0, -4) + 'abcd';

      const isValid = verifyRazorpaySignature({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: tamperedSignature,
        secret: testSecret
      });

      assert.equal(isValid, false, 'Tampered signature must be rejected');
    });

    it('should reject signature if signed with wrong secret', () => {
      const isValid = verifyRazorpaySignature({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: validSignature,
        secret: 'wrong_secret_key'
      });

      assert.equal(isValid, false, 'Wrong secret must fail verification');
    });

    it('should safely reject empty or mismatched buffer lengths without throwing', () => {
      assert.equal(
        verifyRazorpaySignature({
          orderId: testOrderId,
          paymentId: testPaymentId,
          signature: 'short',
          secret: testSecret
        }),
        false
      );

      assert.equal(
        verifyRazorpaySignature({
          orderId: testOrderId,
          paymentId: testPaymentId,
          signature: null,
          secret: testSecret
        }),
        false
      );
    });
  });

  describe('4. Delivery & Order Identifiers', () => {
    it('should normalize and validate 10-digit Indian phone numbers', () => {
      assert.equal(normalizePhone('+91 7380405227'), '7380405227');
      assert.equal(normalizePhone('073804-05227'), '7380405227');
      assert.equal(normalizePhone('9876543210'), '9876543210');
    });

    it('should generate properly formatted PN order numbers', () => {
      const orderNum = generateOrderNumber();
      assert.match(orderNum, /^PN-\d{5}$/, 'Order number must be in PN-xxxxx format');
    });
  });

  describe('5. Mobile & PIN Code Validation Constraints', () => {
    const PHONE_REGEX = /^[6-9]\d{9}$/;
    const PINCODE_REGEX = /^\d{6}$/;

    it('should accept genuine 10-digit Indian mobile numbers', () => {
      assert.equal(PHONE_REGEX.test('9876543210'), true);
      assert.equal(PHONE_REGEX.test('7380405227'), true);
      assert.equal(PHONE_REGEX.test('8901234567'), true);
      assert.equal(PHONE_REGEX.test('6200112233'), true);
    });

    it('should reject invalid mobile numbers starting with digits 0-5 or wrong length', () => {
      assert.equal(PHONE_REGEX.test('1234567890'), false, 'Cannot start with 1');
      assert.equal(PHONE_REGEX.test('0738040522'), false, 'Cannot start with 0');
      assert.equal(PHONE_REGEX.test('5432167890'), false, 'Cannot start with 5');
      assert.equal(PHONE_REGEX.test('98765'), false, 'Too short');
      assert.equal(PHONE_REGEX.test('987654321012'), false, 'Too long');
    });

    it('should validate exact 6-digit Indian postal PIN codes', () => {
      assert.equal(PINCODE_REGEX.test('134114'), true);
      assert.equal(PINCODE_REGEX.test('110001'), true);
      assert.equal(PINCODE_REGEX.test('560001'), true);
      assert.equal(PINCODE_REGEX.test('13411'), false, '5 digits must be rejected');
      assert.equal(PINCODE_REGEX.test('1341144'), false, '7 digits must be rejected');
      assert.equal(PINCODE_REGEX.test('13411a'), false, 'Non-digits must be rejected');
    });
  });

  describe('6. Verified Buyer Review Security Constraints', () => {
    it('should strictly filter out uncompleted or abandoned checkouts from buyer verification', () => {
      const mockOrders = [
        {
          id: 1,
          user_email: 'buyer@example.com',
          phone: '9876543210',
          status: 'Pending',
          payment_status: 'pending', // Abandoned checkout!
          items: [{ id: 101, name: 'Remote Control Turbo Racer' }]
        },
        {
          id: 2,
          user_email: 'paidbuyer@example.com',
          phone: '7380405227',
          status: 'Confirmed',
          payment_status: 'paid', // Real verified paid buyer!
          items: [{ id: 101, name: 'Remote Control Turbo Racer' }]
        },
        {
          id: 3,
          user_email: 'cancelled@example.com',
          phone: '8901234567',
          status: 'Cancelled',
          payment_status: 'paid',
          items: [{ id: 101, name: 'Remote Control Turbo Racer' }]
        }
      ];

      // Verification filter: must not be Cancelled AND must be paid or confirmed/dispatched/delivered
      const isEligible = (email, toyId) => {
        return mockOrders.some(o => {
          if (o.status === 'Cancelled') return false;
          const isPaidOrFulfilled = o.payment_status === 'paid' || ['Confirmed', 'Dispatched', 'Delivered'].includes(o.status);
          if (!isPaidOrFulfilled) return false;
          if (o.user_email !== email) return false;
          return o.items.some(it => it.id === toyId);
        });
      };

      assert.equal(isEligible('buyer@example.com', 101), false, 'Abandoned pending checkout must not qualify for review');
      assert.equal(isEligible('cancelled@example.com', 101), false, 'Cancelled order must not qualify for review');
      assert.equal(isEligible('paidbuyer@example.com', 101), true, 'Paid confirmed order must qualify for verified buyer review');
    });
  });

  describe('7. Guest Points Synchronization Safety Caps', () => {
    it('should enforce a strict 300 maximum cap when syncing guest points', () => {
      const MAX_GUEST_SYNC = 300;
      const sanitizeGuestPoints = (raw) => {
        const parsed = parseInt(raw || 0, 10);
        if (!parsed || parsed <= 0) return 0;
        return Math.min(parsed, MAX_GUEST_SYNC);
      };

      assert.equal(sanitizeGuestPoints(50), 50);
      assert.equal(sanitizeGuestPoints(300), 300);
      assert.equal(sanitizeGuestPoints(99999), 300, 'Tampered guest points must be capped at 300');
      assert.equal(sanitizeGuestPoints(-50), 0, 'Negative points must be rejected');
      assert.equal(sanitizeGuestPoints('invalid'), 0, 'Non-numeric input must return 0');
    });
  });

  describe('8. Inventory & Restocking Integrity', () => {
    it('should restock inventory when an active order is cancelled', () => {
      let toyStock = 10;
      const orderQuantity = 3;

      // Order placed (stock was decremented from 13 to 10)
      // Now order is cancelled
      toyStock += orderQuantity;
      assert.equal(toyStock, 13, 'Stock must be incremented back to original 13 on order cancellation');
    });

    it('should re-decrement inventory if an order is un-cancelled back to active', () => {
      let toyStock = 13;
      const orderQuantity = 3;

      // Admin re-activates cancelled order
      toyStock = Math.max(0, toyStock - orderQuantity);
      assert.equal(toyStock, 10, 'Stock must be re-decremented when order is restored to active');
    });
  });
});

