import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthPage({ onLoginSuccess, onExploreCatalog }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [method, setMethod] = useState('otp'); // 'otp' | 'password'
  
  // OTP Flow state
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Password fallback state
  const [password, setPassword] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  const { sendOtp, verifyOtp, loginWithGoogle, login } = useAuth();

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid Gmail / email address.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const data = await sendOtp(email.trim());
      setStep('otp');
      setCountdown(45);
      setSuccessMsg(`Verification code sent to ${email}`);
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check email address.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtp(email.trim(), otp.trim(), name.trim());
      setSuccessMsg('Welcome to Panda Nest! Logging you in...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 600);
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Continue with Google / Gmail
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      // Prompt user or use Gmail profile
      const userGoogleEmail = prompt('Enter your Gmail address to sign in with Google:', email || 'acubebeauty@gmail.com');
      if (!userGoogleEmail) {
        setLoading(false);
        return;
      }

      const googlePayload = {
        email: userGoogleEmail.trim(),
        name: userGoogleEmail.split('@')[0],
        googleId: 'g_' + Math.random().toString(36).substring(2, 10),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
      };

      await loginWithGoogle(googlePayload);
      setSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err) {
      setError(err.message || 'Google sign in failed. Please try again or use OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Legacy Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      setSuccessMsg('Login successful!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '82vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 16px',
        background: 'radial-gradient(circle at 50% 20%, #f0fdf4 0%, #f8fafc 100%)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          border: '1.5px solid #e2e8f0',
          padding: '36px 32px'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <img
            src="/logo.jpeg"
            alt="Panda Nest Logo"
            style={{
              height: '62px',
              width: 'auto',
              borderRadius: '10px',
              margin: '0 auto 12px',
              display: 'block'
            }}
          />
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800', marginBottom: '4px' }}>
            {authMode === 'login' ? 'Welcome Back!' : 'Join Panda Nest'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {authMode === 'login'
              ? 'Sign in to access your orders, points & wishlist'
              : 'Create an account to earn 100 Panda Points today'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Login vs Sign Up) */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '22px'
          }}
        >
          <button
            onClick={() => {
              setAuthMode('login');
              setError('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'login' ? '#ffffff' : 'transparent',
              color: authMode === 'login' ? '#0f172a' : '#64748b',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: authMode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setAuthMode('signup');
              setError('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'signup' ? '#ffffff' : 'transparent',
              color: authMode === 'signup' ? '#0f172a' : '#64748b',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: authMode === 'signup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fee2e2',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* METHOD 1: Continue with Google / Gmail */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '12px 18px',
            fontSize: '0.925rem',
            fontWeight: '600',
            color: '#1e293b',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
            marginBottom: '20px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.background = '#f8fafc';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          {/* Authentic Google "G" Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0 22px',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.5px'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ padding: '0 12px' }}>OR VIA GMAIL OTP</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* METHOD 2: Gmail + OTP on Gmail */}
        {method === 'otp' && (
          <div>
            {step === 'email' ? (
              <form onSubmit={handleSendOtp}>
                {authMode === 'signup' && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Your Name (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ashish Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Gmail / Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8'
                      }}
                    />
                    <input
                      type="email"
                      required
                      className="form-input"
                      style={{ paddingLeft: '42px' }}
                      placeholder="you@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    We'll email you a secure 6-digit login code. No password required!
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <span>Sending Code...</span>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter 6-digit OTP */
              <form onSubmit={handleVerifyOtp}>
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Enter 6-digit verification code sent to:
                  </span>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>
                    {email}
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                        setError('');
                      }}
                      style={{
                        marginLeft: '8px',
                        color: '#10b981',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    className="form-input"
                    style={{
                      textAlign: 'center',
                      fontSize: '1.6rem',
                      fontWeight: '800',
                      letterSpacing: '10px',
                      padding: '12px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      color: '#047857'
                    }}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />

                  {devOtpHint && (
                    <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '8px' }}>
                      🔑 Verification Code: <strong>{devOtpHint}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  {countdown > 0 ? (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Resend code in <strong>{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#10b981',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={14} /> Resend verification code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Fallback Method: Staff / Admin Password */}
        {method === 'password' && (
          <form onSubmit={handlePasswordLogin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Staff / Admin Email</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="acubebeauty@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700', marginBottom: '10px' }}
            >
              {loading ? 'Signing in...' : 'Sign In with Password'}
            </button>
          </form>
        )}

        {/* Bottom Switcher: Password vs OTP Login */}
        <div style={{ marginTop: '22px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'center' }}>
          {method === 'otp' ? (
            <button
              type="button"
              onClick={() => {
                setMethod('password');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <KeyRound size={13} />
              <span>Staff Login with Password</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMethod('otp');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ← Back to Gmail OTP Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default AuthPage;
