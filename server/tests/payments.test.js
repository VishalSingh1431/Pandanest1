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
});

