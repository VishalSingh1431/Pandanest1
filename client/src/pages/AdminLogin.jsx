import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@pandanest.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 30px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          border: '1.5px solid #e2e8f0',
          padding: '32px 28px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#ecfdf5',
              color: '#059669',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            <ShieldCheck size={30} />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a' }}>Pandanest Admin Portal</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Sign in with email and password to manage inventory and customer leads.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="admin@pandanest.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Admin'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo credentials helper note */}
        <div
          style={{
            marginTop: '20px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.8rem',
            color: '#475569'
          }}
        >
          <div style={{ fontWeight: '700', marginBottom: '4px', color: '#0f172a' }}>
            Default Admin Credentials:
          </div>
          <div>Email: <code>admin@pandanest.in</code></div>
          <div>Password: <code>admin123</code></div>
        </div>
      </div>
    </div>
  );
}
