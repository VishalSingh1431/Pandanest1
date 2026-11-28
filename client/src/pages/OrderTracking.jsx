import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  Search,
  ArrowLeft,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { APP_CONFIG } from '../config';

export function OrderTracking({ onGoToCatalog }) {
  const [queryInput, setQueryInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('order') || '';
  });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (orderIdOrNumber) => {
    if (!orderIdOrNumber || !orderIdOrNumber.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(orderIdOrNumber.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to find tracking details for this order.');
        setOrder(null);
      } else {
        setOrder(data.order);
        // Sync URL param without reload
        const url = new URL(window.location);
        url.searchParams.set('page', 'track');
        url.searchParams.set('order', data.order.order_number);
        window.history.replaceState({}, '', url);
      }
    } catch (e) {
      setError('Network error while checking order tracking status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryInput) {
      fetchTracking(queryInput);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(queryInput);
  };

  const steps = [
    { step: 1, title: 'Order Placed', desc: 'Order received & payment confirmed', icon: Clock },
    { step: 2, title: 'Confirmed & Packed', desc: 'Sanitized & packed in safe bubble wrap', icon: Package },
    { step: 3, title: 'Dispatched / In Transit', desc: 'Handed over to courier express partner', icon: Truck },
    { step: 4, title: 'Delivered', desc: 'Delivered safely to doorstep', icon: CheckCircle2 }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 16px 80px' }}>
      {/* Back button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={onGoToCatalog}
          style={{
            background: 'none',
            border: 'none',
            color: '#059669',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
          Back to Store
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ecfdf5',
            color: '#065f46',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 800,
            marginBottom: '12px',
            border: '1px solid #a7f3d0'
          }}
        >
          <Truck size={16} />
          <span>Live Courier Tracking</span>
        </div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
          Track Your Panda Nest Order 🐼
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Enter your Order Number (e.g. <strong>PN-94812</strong>) to get live dispatch & courier milestones.
        </p>
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: '10px',
          background: '#ffffff',
          padding: '8px',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px', paddingLeft: '14px', gap: '10px' }}>
          <Search size={20} color="#94a3b8" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Enter Order Number e.g. PN-12345"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !queryInput.trim()}
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            flexShrink: 0
          }}
        >
          {loading ? 'Tracking...' : 'Track Order'}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '14px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px'
          }}
        >
          <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Order Not Found</strong>
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Order Results */}
      {order && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Top Banner */}
          <div
            style={{
              background: '#f8fafc',
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Order Number
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                #{order.order_number}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: order.status === 'Cancelled' ? '#fef2f2' : '#ecfdf5',
                  color: order.status === 'Cancelled' ? '#991b1b' : '#065f46',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: `1px solid ${order.status === 'Cancelled' ? '#fecaca' : '#a7f3d0'}`
                }}
              >
                ● Status: {order.status}
              </span>
              <span
                style={{
                  background: order.payment_status === 'paid' ? '#ecfdf5' : '#fef3c7',
                  color: order.payment_status === 'paid' ? '#065f46' : '#92400e',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: `1px solid ${order.payment_status === 'paid' ? '#a7f3d0' : '#fde68a'}`
                }}
              >
                ₹{order.total_amount} ({order.payment_status === 'paid' ? 'Paid' : 'COD / Pending'})
              </span>
            </div>
          </div>

          <div style={{ padding: '32px 24px' }}>
            {(() => {
              const itemsList = Array.isArray(order.items) ? order.items : [];
              const isDigitalOrder =
                itemsList.length > 0 &&
                itemsList.every(
                  (it) => it.is_book || it.is_digital || it.game_key || String(it.id || '').startsWith('game-book')
                );
              if (!isDigitalOrder) return null;
              return (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>
                      📚 Instant Digital Download
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#047857', marginTop: '4px' }}>
                      {order.payment_status === 'paid'
                        ? 'Your PDF is unlocked and ready in My Digital Library.'
                        : 'Complete payment to unlock instant PDF download.'}
                    </div>
                  </div>
                  <a
                    href="/my-downloads"
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '10px 18px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}
                  >
                    Open My Digital Library
                  </a>
                </div>
              );
            })()}
            {/* Stepper Timeline */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
              Delivery Progress
            </h3>

            {order.status === 'Cancelled' ? (
              <div
                style={{
                  background: '#fef2f2',
                  padding: '20px',
                  borderRadius: '12px',
                  color: '#991b1b',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                This order was cancelled. Any amount charged has been automatically initiated for refund.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', position: 'relative' }}>
                {steps.map((st) => {
                  const isCompleted = order.current_step >= st.step;
                  const isCurrent = order.current_step === st.step;
                  const Icon = st.icon;

                  return (
                    <div
                      key={st.step}
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: isCurrent ? '#f0fdf4' : isCompleted ? '#ffffff' : '#f8fafc',
                        border: `2px solid ${isCurrent ? '#10b981' : isCompleted ? '#a7f3d0' : '#e2e8f0'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isCompleted ? '#10b981' : '#cbd5e1',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isCompleted ? '#059669' : '#94a3b8' }}>
                          Step {st.step}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isCompleted ? '#0f172a' : '#64748b' }}>
                        {st.title}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {st.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Courier Details & Estimate */}
            <div
              style={{
                marginTop: '32px',
                padding: '20px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Courier Partner
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {order.courier_name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                  AWB: {order.tracking_number}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Estimated Delivery
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  📦 {order.delivery_estimate}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  Standard Surface Express
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Shipping To
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {order.customer_name} ({order.masked_phone})
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  {order.address}, {order.city} - {order.pincode}
                </div>
              </div>
            </div>

            {/* Items summary */}
            <div style={{ marginTop: '32px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Items in This Package ({order.items?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(order.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{it.is_book ? '📚' : '🧸'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                          {it.name || 'Panda Toy'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Qty: {it.quantity || 1} {it.is_book ? '• Instant Digital Download' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      ₹{it.price || it.sale_price || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support helpline */}
            <div
              style={{
                marginTop: '32px',
                textAlign: 'center',
                paddingTop: '20px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <a
                href={APP_CONFIG.getWhatsAppChatUrl(`Hi Panda Nest! I need an update regarding order #${order.order_number}`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  textDecoration: 'none'
                }}
              >
                <span>Need Help? Chat on WhatsApp</span>
              </a>
              <a
                href={`tel:${APP_CONFIG.STORE_PHONE}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  textDecoration: 'none'
                }}
              >
                <PhoneCall size={16} />
                <span>Call +91 {APP_CONFIG.STORE_PHONE}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;
