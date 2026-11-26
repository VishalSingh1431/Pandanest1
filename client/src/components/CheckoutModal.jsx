import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle, Truck, CreditCard, Award, Package, Sparkles, Tag, Mail } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { parseResponse } from '../utils/api';

export function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout, cart, cartTotal, clearCart, checkoutItem } = useCart();
  const { admin, user } = useAuth();

  const [formData, setFormData] = useState(() => {
    const profile = admin || user;
    const storedPhone = localStorage.getItem('pandanest_member_phone') || profile?.phone || '';
    const storedName = localStorage.getItem('pandanest_member_child') || profile?.name || '';
    return {
      customer_name: storedName,
      phone: storedPhone,
      email: profile?.email || '',
      address: '',
      city: '',
      pincode: '',
      payment_method: 'Online'
    };
  });

  // Keep form data auto-filled whenever modal opens or user profile is loaded
  useEffect(() => {
    if (isCheckoutOpen) {
      const profile = admin || user;
      const storedPhone = localStorage.getItem('pandanest_member_phone') || profile?.phone || '';
      const storedName = localStorage.getItem('pandanest_member_child') || profile?.name || '';
      const storedEmail = profile?.email || '';

      setFormData(prev => ({
        ...prev,
        customer_name: prev.customer_name || storedName,
        phone: prev.phone || storedPhone,
        email: prev.email || storedEmail
      }));
    }
  }, [isCheckoutOpen, admin, user]);

  const [usePandaPoints, setUsePandaPoints] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Auto-fill city & state from 6-digit Indian Postal Pincode
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState('');

  useEffect(() => {
    const fetchPoints = async () => {
      const token = localStorage.getItem('pandanest_admin_token');
      if (token) {
        try {
          const res = await fetch('/api/users/my-points', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAvailablePoints(data.panda_points || 0);
          } else {
            // Fallback to localStorage for guests
            setAvailablePoints(parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10));
          }
        } catch {
          setAvailablePoints(parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10));
        }
      } else {
        // Guest checkout — use localStorage
        setAvailablePoints(parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10));
      }

      const savedPhone = localStorage.getItem('pandanest_member_phone') || '';
      setFormData(prev => ({
        ...prev,
        phone: prev.phone || savedPhone,
        customer_name: prev.customer_name || admin?.name || '',
        email: prev.email || admin?.email || ''
      }));
    };

    if (isCheckoutOpen) fetchPoints();
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const checkoutQuantity = Math.max(1, parseInt(checkoutItem?.quantity || 1, 10));
  const itemsToCheckout = checkoutItem
    ? [{ ...checkoutItem, quantity: checkoutQuantity }]
    : cart;

  const rawTotal = checkoutItem
    ? Number(checkoutItem.price) * checkoutQuantity
    : cartTotal;

  // 10 Panda coins = ₹1 discount (Max 300 Panda Coins = ₹30 discount allowed per order)
  const MAX_REDEEM_POINTS = 300;
  const maxUsablePoints = Math.min(availablePoints, MAX_REDEEM_POINTS);
  const redeemableRupees = Math.floor(maxUsablePoints / 10);
  const pointsDiscount = (usePandaPoints && availablePoints >= 10) ? Math.min(redeemableRupees, rawTotal) : 0;
  const couponDiscount = appliedCoupon ? Number(appliedCoupon.discount_amount) : 0;
  const finalPayable = Math.max(0, rawTotal - pointsDiscount - couponDiscount);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), order_amount: rawTotal })
      });
      const data = await parseResponse(res, 'Failed to apply coupon.');
      setAppliedCoupon(data);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePincodeChange = async (val) => {
    const cleanPin = val.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      setPincodeMessage('Detecting city...');
      try {
        let detectedCity = '';
        try {
          const res = await fetch(`/api/orders/pincode/${cleanPin}`);
          if (res.ok) {
            const data = await res.json();
            if (data.city) detectedCity = data.city;
          }
        } catch {
          // Fallback to direct client API if backend proxy fails
        }

        if (!detectedCity) {
          const resDirect = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
          const directData = await resDirect.json();
          if (Array.isArray(directData) && directData[0]?.Status === 'Success' && directData[0]?.PostOffice?.length > 0) {
            const po = directData[0].PostOffice[0];
            detectedCity = po.District && po.State
              ? (po.District.toLowerCase() === po.State.toLowerCase() ? po.District : `${po.District}, ${po.State}`)
              : (po.District || po.State || '');
          }
        }

        if (detectedCity) {
          setFormData(prev => ({ ...prev, city: detectedCity }));
          setPincodeMessage(`✓ ${detectedCity}`);
        } else {
          setPincodeMessage('Not found');
        }
      } catch {
        setPincodeMessage('');
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setPincodeMessage('');
    }
  };

  // Helper to ensure Razorpay SDK script is loaded
  const ensureRazorpayLoaded = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const isDigitalOnlyOrder = itemsToCheckout.length > 0 && itemsToCheckout.every(it =>
    it.is_book ||
    it.is_digital ||
    it.game_key ||
    String(it.id || '').startsWith('game-book') ||
    it.category === 'Digital Books' ||
    it.category === 'Digital & Books'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!formData.customer_name || !formData.phone) {
      setError('Please provide your name and phone number.');
      return;
    }

    if (!isDigitalOnlyOrder && (!formData.address || !formData.city || !formData.pincode)) {
      setError('Please fill out all delivery address fields for shipping.');
      return;
    }

    const cleanPhone = String(formData.phone || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!isDigitalOnlyOrder) {
      const cleanPin = String(formData.pincode || '').replace(/\D/g, '');
      if (cleanPin.length !== 6) {
        setError('Please enter a valid 6-digit Indian postal PIN code.');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Ensure Razorpay Checkout SDK is ready
      const isRzpLoaded = await ensureRazorpayLoaded();
      if (!isRzpLoaded || !window.Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      const token = localStorage.getItem('pandanest_admin_token') || localStorage.getItem('pandanest_user_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 2. Initialize order on server (Strict Zero-Client-Trust Amount recalculation)
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          phone: cleanPhone,
          email: formData.email.trim(),
          address: isDigitalOnlyOrder ? 'Digital Delivery (Instant Download)' : formData.address.trim(),
          city: isDigitalOnlyOrder ? 'Online' : formData.city.trim(),
          pincode: isDigitalOnlyOrder ? '000000' : formData.pincode.trim(),
          items: itemsToCheckout,
          coupon_code: appliedCoupon?.code || '',
          points_used: pointsDiscount > 0 ? Math.min(pointsDiscount * 10, MAX_REDEEM_POINTS) : 0
        })
      });

      const orderData = await res.json();

      if (!res.ok) {
        if (orderData.code === 'RAZORPAY_NOT_CONFIGURED') {
          throw new Error('Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env');
        }
        throw new Error(orderData.error || 'Failed to initialize payment order.');
      }

      // 3. Launch Razorpay Checkout Popup
      const options = {
        key: orderData.key_id,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'Panda Nest',
        description: `Order #${orderData.order_number} (${itemsToCheckout.length} items)`,
        image: '/logo.jpeg',
        order_id: orderData.order_id,
        prefill: {
          name: formData.customer_name.trim(),
          contact: cleanPhone,
          email: formData.email.trim()
        },
        theme: {
          color: '#10b981' // Panda Nest Brand Green
        },
        handler: async function (response) {
          // Response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
          try {
            setLoading(true);

            // 4. Verify payment cryptographically with timing-safe HMAC-SHA256 on server
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_number: orderData.order_number
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Cryptographic payment verification failed.');
            }

            // Points deduction UI feedback
            if (pointsDiscount > 0) {
              const pointsUsed = pointsDiscount * 10;
              const remaining = Math.max(0, availablePoints - pointsUsed);
              setAvailablePoints(remaining);
              localStorage.setItem('pandanest_panda_points', String(remaining));
              window.dispatchEvent(new Event('pandanest-points-updated'));
            }

            // Confetti celebration
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 }
            });

            setOrderSuccess(verifyData.order || {
              order_number: orderData.order_number,
              customer_name: formData.customer_name,
              total_amount: orderData.total_amount,
              payment_method: 'Razorpay (Paid Online)'
            });

            if (!checkoutItem) {
              clearCart();
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setError(verifyErr.message || 'Payment was received but verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setNotice('Payment window closed. Your cart and details have been safely saved here.');
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (failResp) {
        setLoading(false);
        const reason = failResp.error?.description || 'Payment could not be completed.';
        setError(`Payment Failed: ${reason}`);
      });

      rzpInstance.open();
    } catch (err) {
      setError(err.message || 'Payment initialization failed.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(null);
    setError('');
    setNotice('');
    closeCheckout();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '580px', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>
          <X size={18} />
        </button>

        {orderSuccess ? (
          /* Order Confirmed Screen */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                background: '#ecfdf5',
                color: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
              }}
            >
              <CheckCircle size={40} />
            </div>

            <div className="badge badge-green" style={{ marginBottom: '8px' }}>
              Order Confirmed & Received!
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '8px' }}>
              Woohoo! Your Toys are on the Way! 🚀
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '20px' }}>
              Thank you, <strong>{orderSuccess.customer_name}</strong>. Our Panchkula dispatch center is preparing your toys with love!
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Order Number:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{orderSuccess.order_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  Online Paid (Prepaid)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Seller GSTIN:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>06BBZPY5715M1ZI</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Shipping:</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>FREE Delivery 🎉</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Delivery Address:</span>
                <span style={{ fontWeight: '500', color: '#334155', maxWidth: '60%', textAlign: 'right' }}>
                  {orderSuccess.address}, {orderSuccess.city} - {orderSuccess.pincode}
                </span>
              </div>
              {formData.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Receipt & Updates:</span>
                  <span style={{ fontWeight: '600', color: '#047857' }}>Sent to {formData.email} ✉️</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '1.05rem', fontWeight: '800' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#047857' }}>₹{Number(orderSuccess.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={handleClose}>
              Continue Shopping at Panda Nest
            </button>
          </div>
        ) : (
          /* Standard Checkout Form */
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                {isDigitalOnlyOrder ? 'Checkout' : 'Delivery & Checkout'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                {isDigitalOnlyOrder
                  ? 'Enter your contact details to complete your order.'
                  : 'Free shipping across all pincodes in India.'}
              </p>
            </div>

            {notice && (
              <div
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>ℹ️</span> {notice}
              </div>
            )}

            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  marginBottom: '16px'
                }}
              >
                {error}
              </div>
            )}

            {/* Order Items Preview with Thumbnails */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                maxHeight: '150px',
                overflowY: 'auto'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                Items ({itemsToCheckout.length}):
              </div>
              {itemsToCheckout.map((item, idx) => (
                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.875rem', marginBottom: '8px', paddingBottom: '6px', borderBottom: idx < itemsToCheckout.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <img
                      src={item.image_url || '/logo.jpeg'}
                      alt={item.name}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff', border: '1px solid #cbd5e1', flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.src = '/logo.jpeg'; }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84rem' }}>
                        {item.name}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem' }}>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: '700', color: '#047857', flexShrink: 0, fontSize: '0.9rem' }}>
                    ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Panda Points Redemption Option (10 Coins = ₹1, Max 300 coins = ₹30 off per order) */}
            {availablePoints >= 10 && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={22} color="#d97706" />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#92400e' }}>
                      🪙 Redeem {Math.min(availablePoints, MAX_REDEEM_POINTS, Math.floor(rawTotal * 10))} Panda Coins
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', marginLeft: '6px' }}>
                        (Max 300 Coins = ₹30 off / order)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: '600' }}>
                      You have {availablePoints} coins • Save ₹{Math.min(redeemableRupees, rawTotal)} instantly!
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', color: '#047857' }}>
                  <input
                    type="checkbox"
                    checked={usePandaPoints}
                    onChange={(e) => setUsePandaPoints(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  <span>Apply -₹{Math.min(redeemableRupees, rawTotal)}</span>
                </label>
              </div>
            )}

            {/* Promo / Coupon Code Section */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                <Tag size={16} color="#10b981" />
                <span>Have a Promo Code or Gift Coupon?</span>
              </div>

              {appliedCoupon ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '8px 12px' }}>
                  <div>
                    <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: '800' }}>
                      {appliedCoupon.code}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#047857', marginLeft: '8px', fontWeight: '600' }}>
                      You saved ₹{appliedCoupon.discount_amount}!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter code (e.g. PANDA50, WELCOME10)"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError('');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      textTransform: 'uppercase'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 16px', fontWeight: '700' }}
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              )}

              {couponError && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', fontWeight: '600' }}>
                  {couponError}
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#047857' }}>
                <span>Delivery:</span>
                <span style={{ fontWeight: '700' }}>
                  {isDigitalOnlyOrder ? 'Instant Digital Download (FREE) ⚡' : 'FREE Shipping Across India 🎉'}
                </span>
              </div>
              {pointsDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#b45309' }}>
                  <span>Panda Club Points Discount:</span>
                  <span style={{ fontWeight: '700' }}>- ₹{pointsDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#059669' }}>
                  <span>Coupon Discount ({appliedCoupon.code}):</span>
                  <span style={{ fontWeight: '700' }}>- ₹{couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #a7f3d0', paddingTop: '6px', marginTop: '6px', fontWeight: '800', fontSize: '1.05rem', color: '#065f46' }}>
                <span>Final Payable Amount:</span>
                <span>₹{finalPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* If order is purely digital AND signed in, show prefilled profile chip */}
              {isDigitalOnlyOrder && (admin || user) && formData.email && formData.phone ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {formData.customer_name || 'Valued Customer'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      {formData.phone} • {formData.email}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
                    Auto-Filled
                  </span>
                </div>
              ) : (
                <>
                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        name="customer_name"
                        required
                        className="form-input"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.customer_name}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact / WhatsApp Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="form-input"
                        placeholder="e.g. 7380405227"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Email Address <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'normal' }}>(Optional — for order receipt &amp; dispatch updates)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="e.g. pooja@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {/* Physical Delivery Address Fields — ALWAYS required and shown for all physical toy orders */}
              {!isDigitalOnlyOrder && (
                <>
                  <div className="form-group">
                    <label className="form-label">Complete Delivery Address *</label>
                    <textarea
                      name="address"
                      required
                      rows={2}
                      className="form-input"
                      placeholder="House/Flat No., Street, Landmark"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ margin: 0 }}>Postal Pincode *</label>
                        {pincodeLoading && (
                          <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '600' }}>
                            Detecting...
                          </span>
                        )}
                        {!pincodeLoading && pincodeMessage && (
                          <span style={{ fontSize: '0.72rem', color: pincodeMessage.startsWith('✓') ? '#059669' : '#dc2626', fontWeight: '700' }}>
                            {pincodeMessage}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="pincode"
                        required
                        maxLength={6}
                        className="form-input"
                        placeholder="e.g. 134114 (Auto-fills city)"
                        value={formData.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City & State *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        className="form-input"
                        placeholder="e.g. Panchkula, Haryana"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div
                  style={{
                    border: '2px solid #10b981',
                    background: '#ecfdf5',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} color="#059669" />
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>Online Payment (Prepaid)</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Instant secure checkout via UPI, Cards, NetBanking</span>
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '0.72rem', fontWeight: '800' }}>
                    FAST &amp; SECURE
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: '10px' }}
              >
                {loading ? 'Opening Secure Payment...' : `🔒 Pay & Place Order (₹${finalPayable.toLocaleString('en-IN')})`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
