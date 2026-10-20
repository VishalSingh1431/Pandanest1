import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle, Truck, CreditCard, Award, Package, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout, cart, cartTotal, clearCart, checkoutItem } = useCart();

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    payment_method: 'COD'
  });

  const [usePandaPoints, setUsePandaPoints] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    const points = parseInt(localStorage.getItem('pandanest_panda_points') || '0', 10);
    setAvailablePoints(points);

    const savedPhone = localStorage.getItem('pandanest_member_phone') || '';
    const savedChild = localStorage.getItem('pandanest_member_child') || '';
    if (savedPhone) {
      setFormData(prev => ({
        ...prev,
        phone: prev.phone || savedPhone,
        customer_name: prev.customer_name || (savedChild ? `Parent of ${savedChild}` : '')
      }));
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const itemsToCheckout = checkoutItem
    ? [{ ...checkoutItem, quantity: 1 }]
    : cart;

  const rawTotal = checkoutItem
    ? Number(checkoutItem.price)
    : cartTotal;

  // 100 Panda points = ₹50 discount
  const pointsDiscount = (usePandaPoints && availablePoints >= 100) ? 50 : 0;
  const finalPayable = Math.max(0, rawTotal - pointsDiscount);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_name || !formData.phone || !formData.address || !formData.city || !formData.pincode) {
      setError('Please fill out all delivery address fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: itemsToCheckout,
          total_amount: finalPayable,
          points_used: pointsDiscount > 0 ? 100 : 0
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      if (pointsDiscount > 0) {
        const remaining = Math.max(0, availablePoints - 100);
        localStorage.setItem('pandanest_panda_points', String(remaining));
        setAvailablePoints(remaining);
      }

      // Celebrate with confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setOrderSuccess(data.order);
      if (!checkoutItem) {
        clearCart();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(null);
    setError('');
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
                  {orderSuccess.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'Online Paid'}
                </span>
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
              <div className="badge badge-amber" style={{ marginBottom: '6px' }}>
                <Package size={13} /> Panda Nest Express Delivery
              </div>
              <h2 style={{ fontSize: '1.5rem', color: '#0f172a' }}>Delivery & Checkout</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Free shipping across all pincodes in India.
              </p>
            </div>

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

            {/* Order Items Preview */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                maxHeight: '130px',
                overflowY: 'auto'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                Items ({itemsToCheckout.length}):
              </div>
              {itemsToCheckout.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                  <span style={{ color: '#334155' }}>
                    {item.name} <span style={{ color: '#94a3b8' }}>x {item.quantity}</span>
                  </span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>
                    ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Panda Points Redemption Option */}
            {availablePoints >= 100 && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#d97706" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#92400e' }}>
                      Redeem 100 Panda Points
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                      Get ₹50 instant discount on this order!
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: '#047857' }}>
                  <input
                    type="checkbox"
                    checked={usePandaPoints}
                    onChange={(e) => setUsePandaPoints(e.target.checked)}
                  />
                  <span>Apply -₹50</span>
                </label>
              </div>
            )}

            {/* Price Summary */}
            <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#047857' }}>
                <span>Shipping Charges:</span>
                <span style={{ fontWeight: '700' }}>FREE Delivery 🎉</span>
              </div>
              {pointsDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#b45309' }}>
                  <span>Panda Club Points Discount:</span>
                  <span style={{ fontWeight: '700' }}>- ₹50</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #a7f3d0', paddingTop: '6px', marginTop: '6px', fontWeight: '800', fontSize: '1.05rem', color: '#065f46' }}>
                <span>Final Payable Amount:</span>
                <span>₹{finalPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name / Parent Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    className="form-input"
                    placeholder="e.g. Pooja Sharma"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    className="form-input"
                    placeholder="e.g. Panchkula, Chandigarh, Delhi"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    className="form-input"
                    placeholder="e.g. 134114"
                    value={formData.pincode}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label">Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label
                    style={{
                      border: formData.payment_method === 'COD' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                      background: formData.payment_method === 'COD' ? '#ecfdf5' : '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="COD"
                        checked={formData.payment_method === 'COD'}
                        onChange={handleChange}
                      />
                      <Truck size={16} color="#10b981" />
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Cash on Delivery</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '20px' }}>
                      Pay when delivered
                    </span>
                  </label>

                  <label
                    style={{
                      border: formData.payment_method === 'Online' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                      background: formData.payment_method === 'Online' ? '#ecfdf5' : '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="Online"
                        checked={formData.payment_method === 'Online'}
                        onChange={handleChange}
                      />
                      <CreditCard size={16} color="#059669" />
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Online Pay (UPI/Card)</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '20px' }}>
                      Instant secure checkout
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: '10px' }}
              >
                {loading ? 'Confirming Order...' : `Place Order (₹${finalPayable.toLocaleString('en-IN')})`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
