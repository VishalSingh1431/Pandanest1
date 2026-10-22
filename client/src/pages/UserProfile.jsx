import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  ShoppingBag,
  LogOut,
  Shield,
  Gift,
  Sparkles,
  CheckCircle2,
  Package,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  ChevronRight,
  Heart,
  Star,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserProfile({ onGoToCatalog, onGoToAdmin }) {
  const { user, admin, logout, isAdmin, isSuperAdmin, token } = useAuth();
  const profile = user || admin || {};
  
  const SUPER_ADMIN_EMAILS = ['acubebeauty@gmail.com', 'vishalsingh05072003@gmail.com'];
  const profileEmail = (profile?.email || admin?.email || '').toLowerCase().trim();
  const isUserSuperAdmin = isSuperAdmin || profile?.role === 'super_admin' || SUPER_ADMIN_EMAILS.includes(profileEmail);
  const isUserAdmin = isAdmin || isUserSuperAdmin || ['super_admin', 'admin'].includes(profile?.role);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'birthday' | 'settings'
  const [points, setPoints] = useState(() => localStorage.getItem('pandanest_panda_points') || '100');
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Child birthday state
  const [childName, setChildName] = useState(() => localStorage.getItem('pandanest_child_name') || '');
  const [childDob, setChildDob] = useState(() => localStorage.getItem('pandanest_child_dob') || '');
  const [birthdaySaved, setBirthdaySaved] = useState(false);

  // Review Modal state for purchased items
  const [reviewModalToy, setReviewModalToy] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewedToyIds, setReviewedToyIds] = useState([]);

  // Fetch customer personal orders & points
  useEffect(() => {
    const fetchMyOrders = async () => {
      if (!token) return;
      setLoadingOrders(true);
      try {
        const res = await fetch('/api/orders/my-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Could not fetch personal orders:', err.message);
      } finally {
        setLoadingOrders(false);
      }
    };

    const fetchMyPoints = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/users/my-points', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.points === 'number') {
            setPoints(data.points);
          }
        }
      } catch (err) {
        console.warn('Could not fetch personal points:', err.message);
      }
    };

    fetchMyOrders();
    fetchMyPoints();
  }, [token]);

  const handleOpenReviewModal = (item) => {
    setReviewModalToy(item);
    setReviewForm({ rating: 5, comment: '' });
    setReviewError('');
    setReviewSuccess('');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalToy) return;
    setReviewError('');
    setReviewSuccess('');
    setReviewLoading(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          toy_id: reviewModalToy.id,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewSuccess('Thank you! Your verified rating & review has been published.');
      setReviewedToyIds(prev => [...prev, reviewModalToy.id]);
      setTimeout(() => {
        setReviewModalToy(null);
        setReviewSuccess('');
      }, 1600);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveBirthday = async (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('pandanest_child_name', childName.trim());
      localStorage.setItem('pandanest_child_dob', childDob);
      
      // Also save to backend lead API
      await fetch('/api/leads/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: childName.trim(),
          phone: profile.phone || '',
          dob: childDob,
          parent_name: profile.name || 'Parent'
        })
      });
      setBirthdaySaved(true);
      setTimeout(() => setBirthdaySaved(false), 3000);
    } catch (err) {
      console.warn('Birthday save note:', err.message);
      setBirthdaySaved(true);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '85vh', padding: '36px 0 60px' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Top Profile Card Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
            borderRadius: '24px',
            padding: '36px 32px',
            color: '#ffffff',
            boxShadow: '0 12px 30px -10px rgba(16, 185, 129, 0.3)',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              right: '-40px',
              top: '-40px',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap',
              position: 'relative',
              zIndex: 2
            }}
          >
            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '800',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  flexShrink: 0
                }}
              >
                {profile.name ? profile.name.charAt(0).toUpperCase() : '🐼'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                    {profile.name || 'Panda Nest Member'}
                  </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{profile.email}</span>
                  {isUserSuperAdmin ? (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      👑 Super Admin
                    </span>
                  ) : isUserAdmin ? (
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}
                    >
                      🛡️ Store Admin
                    </span>
                  ) : (
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}
                    >
                      🌟 Panda Club Member
                    </span>
                  )}

                  {isUserAdmin && (
                    <button
                      onClick={onGoToAdmin}
                      style={{
                        background: '#ffffff',
                        color: '#065f46',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '4px 12px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Shield size={14} color="#059669" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Reward Points Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(10px)',
                borderRadius: '18px',
                padding: '16px 24px',
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                <Award size={26} color="#d97706" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9, fontWeight: '700' }}>
                  Points Wallet
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', lineHeight: 1.1 }}>
                  {points} pts
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Navigation Menu */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              padding: '16px',
              height: 'fit-content',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'overview' ? '#ecfdf5' : 'transparent',
                  color: activeTab === 'overview' ? '#047857' : '#475569',
                  fontWeight: activeTab === 'overview' ? '700' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <Sparkles size={18} color={activeTab === 'overview' ? '#059669' : '#64748b'} />
                <span>Rewards & Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'orders' ? '#ecfdf5' : 'transparent',
                  color: activeTab === 'orders' ? '#047857' : '#475569',
                  fontWeight: activeTab === 'orders' ? '700' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <Package size={18} color={activeTab === 'orders' ? '#059669' : '#64748b'} />
                <span>My Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('birthday')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'birthday' ? '#ecfdf5' : 'transparent',
                  color: activeTab === 'birthday' ? '#047857' : '#475569',
                  fontWeight: activeTab === 'birthday' ? '700' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <Gift size={18} color={activeTab === 'birthday' ? '#059669' : '#64748b'} />
                <span>Child Birthday Club</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'settings' ? '#ecfdf5' : 'transparent',
                  color: activeTab === 'settings' ? '#047857' : '#475569',
                  fontWeight: activeTab === 'settings' ? '700' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <User size={18} color={activeTab === 'settings' ? '#059669' : '#64748b'} />
                <span>Account Info</span>
              </button>
            </nav>

            <div style={{ margin: '16px 0', borderTop: '1px solid #f1f5f9' }} />

            {/* Extra Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isUserAdmin && (
                <button
                  onClick={onGoToAdmin}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #10b981',
                    background: '#f0fdf4',
                    color: '#047857',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Shield size={16} />
                  <span>Admin Dashboard</span>
                </button>
              )}

              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Main Content Panel */}
          <div>
            {/* TAB 1: OVERVIEW & REWARDS */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Rewards Highlight Card */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1.5px solid #e2e8f0',
                    padding: '28px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '12px', color: '#b45309' }}>
                      <Award size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>
                        Panda Rewards Wallet
                      </h3>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        Earn points through games, orders & special celebrations
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: '1px solid #fde68a',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700' }}>AVAILABLE POINTS</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#78350f' }}>{points} Pts</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#92400e' }}>
                        🎉 Value: <strong>₹{Math.floor(Number(points) / 10)} OFF</strong> on your next toy purchase!
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={onGoToCatalog}
                      style={{ padding: '10px 20px', fontWeight: '700' }}
                    >
                      Redeem in Catalog
                    </button>
                  </div>

                  {/* How to earn more points */}
                  <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '12px', fontWeight: '700' }}>
                    How to Earn More Points:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '700', color: '#047857', fontSize: '0.9rem', marginBottom: '4px' }}>
                        🎲 Play Truth or Dare
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        Earn +10 points each round you complete with family!
                      </p>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '700', color: '#047857', fontSize: '0.9rem', marginBottom: '4px' }}>
                        🎂 Child Birthday Club
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        Get special celebration surprises and birthday codes!
                      </p>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '700', color: '#047857', fontSize: '0.9rem', marginBottom: '4px' }}>
                        🛍️ Toy Orders
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        Earn bonus reward coins with every confirmed order!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Perks Strip */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1.5px solid #e2e8f0',
                    padding: '24px 28px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '20px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px', borderRadius: '12px' }}>
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>FREE Delivery</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>All toys across India</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px', borderRadius: '12px' }}>
                      <Shield size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>100% Child Safe</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Non-toxic, certified toys</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px', borderRadius: '12px' }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>48h Easy Returns</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hassle-free replacement</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MY ORDERS */}
            {activeTab === 'orders' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '28px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                  <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>
                    My Orders & Delivery
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={onGoToCatalog}
                  >
                    Browse Catalog
                  </button>
                </div>

                {loadingOrders ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Fetching your toy orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '42px', marginBottom: '10px' }}>📦</div>
                    <h4 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '6px' }}>No orders placed yet</h4>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 18px' }}>
                      Your order history will appear here once you place an order. Remember, free delivery applies to every toy!
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={onGoToCatalog}
                      style={{ padding: '10px 24px' }}
                    >
                      Shop Featured Toys
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {orders.map((order) => {
                      let parsedItems = [];
                      try {
                        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                      } catch {
                        parsedItems = [];
                      }

                      return (
                        <div
                          key={order.id}
                          style={{
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '20px',
                            background: '#ffffff',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <span style={{ fontWeight: '800', color: '#047857', fontSize: '1.05rem' }}>
                                Order #{order.order_number}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px' }}>
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <span
                              style={{
                                background:
                                  order.status === 'Delivered'
                                    ? '#ecfdf5'
                                    : order.status === 'Dispatched'
                                    ? '#eff6ff'
                                    : '#fef3c7',
                                color:
                                  order.status === 'Delivered'
                                    ? '#047857'
                                    : order.status === 'Dispatched'
                                    ? '#1d4ed8'
                                    : '#b45309',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                fontSize: '0.8rem',
                                fontWeight: '700'
                              }}
                            >
                              ● {order.status || 'Processing'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '12px' }}>
                            {parsedItems.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
                                <div>
                                  <span style={{ fontWeight: '600' }}>{item.quantity}x {item.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontWeight: '600' }}>₹{item.price * item.quantity}</span>
                                  {reviewedToyIds.includes(item.id) ? (
                                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                                      ✓ Reviewed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenReviewModal(item)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '8px',
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Star size={12} fill="#047857" /> Rate Toy
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                              Delivery: {order.address}, {order.city} ({order.pincode})
                            </span>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>
                              Total: ₹{order.total_amount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CHILD BIRTHDAY CLUB */}
            {activeTab === 'birthday' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '28px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '12px', color: '#047857' }}>
                    <Gift size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>
                      Child Birthday Club 🎂
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Register child's birthday to unlock annual gifts and age-curated toy ideas
                    </span>
                  </div>
                </div>

                {birthdaySaved && (
                  <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} />
                    <span>Child birthday details saved successfully!</span>
                  </div>
                )}

                <form onSubmit={handleSaveBirthday} style={{ maxWidth: '440px' }}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Child's Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Aarav / Ananya"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Child's Date of Birth</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={childDob}
                      onChange={(e) => setChildDob(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', fontWeight: '700' }}
                  >
                    Save Birthday Registry
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '28px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '0 0 20px', fontWeight: '800' }}>
                  Account Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Full Name</span>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {profile.name || 'Panda Nest User'}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Registered Gmail</span>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {profile.email}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Account Privilege</span>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#047857', marginTop: '2px' }}>
                      {profile.role ? profile.role.toUpperCase() : 'USER'}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Panda Rewards</span>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#d97706', marginTop: '2px' }}>
                      {points} Points Active
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={logout}
                    className="btn btn-secondary"
                    style={{ borderColor: '#fee2e2', color: '#991b1b', background: '#fef2f2', fontWeight: '700' }}
                  >
                    <LogOut size={16} />
                    <span>Log Out of Account</span>
                  </button>

                  {isUserAdmin && (
                    <button
                      onClick={onGoToAdmin}
                      className="btn btn-primary"
                      style={{ fontWeight: '700' }}
                    >
                      <Shield size={16} />
                      <span>Switch to Admin Panel</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      {/* Rating & Review Modal for Verified Buyers */}
      {reviewModalToy && (
        <div className="modal-overlay" onClick={() => setReviewModalToy(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0 }}>
                Rate & Review Toy
              </h2>
              <button className="modal-close" onClick={() => setReviewModalToy(null)} style={{ position: 'static' }}>
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🧸</div>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                  {reviewModalToy.name}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                  ✓ Verified Purchased Item
                </span>
              </div>
            </div>

            {reviewError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '14px' }}>
                {reviewError}
              </div>
            )}

            {reviewSuccess && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: '700' }}>
                {reviewSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitReview}>
              <div className="form-group" style={{ textAlign: 'center', margin: '16px 0' }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>Your Star Rating</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        transform: reviewForm.rating >= star ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <Star
                        size={32}
                        color={reviewForm.rating >= star ? '#f59e0b' : '#cbd5e1'}
                        fill={reviewForm.rating >= star ? '#f59e0b' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: '700', marginTop: '6px', display: 'block' }}>
                  {reviewForm.rating === 5 ? '⭐⭐⭐⭐⭐ Excellent!' : reviewForm.rating === 4 ? '⭐⭐⭐⭐ Great Toy' : reviewForm.rating === 3 ? '⭐⭐⭐ Good' : reviewForm.rating === 2 ? '⭐⭐ Fair' : '⭐ Needs Improvement'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Review / Feedback</label>
                <textarea
                  rows={3}
                  className="form-input"
                  placeholder="Share how much your child loved this toy, its quality, durability, and play value..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setReviewModalToy(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Rating & Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default UserProfile;
