import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, ArrowRight, Heart, Phone, Calendar, CheckCircle2, Award } from 'lucide-react';

export function WelcomeQR({ onContinueToCatalog }) {
  const [formData, setFormData] = useState({
    child_name: '',
    phone: '',
    dob: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(100);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.child_name || !formData.phone || !formData.dob) {
      setError('Please fill out all fields so we can unlock your Panda Points and birthday rewards!');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit details');
      }

      setSubmissionResult(data);

      // Only award 100 points on first registration; if already submitted before, do NOT give points again
      if (data.points_awarded > 0) {
        localStorage.setItem('pandanest_panda_points', '100');
        // Confetti celebration
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 }
        });
      } else {
        if (!localStorage.getItem('pandanest_panda_points')) {
          localStorage.setItem('pandanest_panda_points', String(data.panda_points || 0));
        }
      }

      // Store member details locally
      localStorage.setItem('pandanest_member_child', formData.child_name);
      localStorage.setItem('pandanest_member_phone', formData.phone);

      setSubmitted(true);

      setTimeout(() => {
        onContinueToCatalog();
      }, 2000);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onContinueToCatalog();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 10% 20%, rgb(236, 253, 245) 0%, rgb(255, 255, 255) 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.15), 0 1px 3px rgba(0,0,0,0.05)',
          border: '1.5px solid #d1fae5',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Playful Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '32px 24px 26px',
            textAlign: 'center',
            color: 'white',
            position: 'relative'
          }}
        >
          <div>
            <img
              src="/logo.jpeg"
              alt="Panda Nest"
              style={{
                height: '84px',
                width: 'auto',
                marginBottom: '12px',
                borderRadius: '16px',
                background: '#ffffff',
                padding: '4px 10px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
              }}
              className="animate-float"
            />
          </div>

          <div
            className="badge badge-amber"
            style={{
              display: 'inline-flex',
              marginBottom: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <Sparkles size={13} /> Welcome to Panda Nest!
          </div>

          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px', color: 'white' }}>
            Join Panda Club & Play!
          </h1>
          <p style={{ fontSize: '0.925rem', opacity: 0.95, maxWidth: '400px', margin: '0 auto' }}>
            Register your child's birthday to unlock <strong>100 Panda Points</strong>, birthday gifts, and age-perfect toy recommendations.
          </p>

          <div
            style={{
              marginTop: '12px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              padding: '6px 14px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}
          >
            <Award size={16} color="#fef08a" />
            <span>🎁 100 Panda Points Welcome Reward!</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px 24px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
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
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '8px' }}>
                {submissionResult?.already_registered ? `Welcome Back, ${formData.child_name}! 🐼` : 'Welcome to Panda Club! 🎉'}
              </h2>
              <div
                className={submissionResult?.already_registered ? 'badge badge-green' : 'badge badge-amber'}
                style={{ fontSize: '0.92rem', padding: '8px 16px', marginBottom: '14px' }}
              >
                {submissionResult?.already_registered
                  ? '⭐ Member Details Updated (Bonus points are one-time)'
                  : '🪙 +100 Panda Points Added to Your Bag!'}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                Taking you to the toy catalog now...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#991b1b',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    marginBottom: '18px'
                  }}
                >
                  {error}
                </div>
              )}

              {/* Child Name */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={15} color="#ec4899" />
                  Child's Name *
                </label>
                <input
                  type="text"
                  name="child_name"
                  required
                  className="form-input"
                  placeholder="e.g. Aarav / Ananya"
                  value={formData.child_name}
                  onChange={handleChange}
                />
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} color="#059669" />
                  Mobile Number (WhatsApp) *
                </label>
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

              {/* Child's Date of Birth */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="#8b5cf6" />
                  Child's Date of Birth (DOB) *
                </label>
                <input
                  type="date"
                  name="dob"
                  required
                  className="form-input"
                  value={formData.dob}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  🎂 We use this to celebrate their birthday with special gifts & discount coupons!
                </span>
              </div>

              {/* Actions: Submit vs Skip */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  <Gift size={20} />
                  <span>{loading ? 'Joining Panda Club...' : 'Unlock 100 Points & Enter Store'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px', color: '#64748b' }}
                  onClick={handleSkip}
                >
                  <span>Skip for now & Browse Toys</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Footer note with official contact */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
            Panda Nest • <span style={{ color: '#10b981', fontWeight: '600' }}>pandanest.in</span> • Support: 7380405227
          </div>
        </div>
      </div>
    </div>
  );
}
