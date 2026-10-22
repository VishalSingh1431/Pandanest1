import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Safe response parser that prevents "Unexpected end of JSON input" errors
async function parseJsonResponse(res, fallbackErrMsg) {
  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Network connection error. Please verify your internet connection.');
  }

  let data = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Server response error (${res.status}). Please try again.`);
      }
      throw new Error('Unexpected server response format.');
    }
  }

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : (fallbackErrMsg || `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return data || {};
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pandanest_admin_token') || null);
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('pandanest_admin_profile');
      if (!saved) return null;
      return JSON.parse(saved); // Trust the server-issued role, no client override
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only verify once on mount — not on every token change to prevent infinite refresh loop
    const currentToken = localStorage.getItem('pandanest_admin_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }
    const verifyToken = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (res.ok) {
          const data = await parseJsonResponse(res);
          const userObj = data.admin || data.user;
          setAdmin(userObj);
          // Only update token in storage if server issued a new one (role changed)
          if (data.token) {
            setToken(data.token);
            localStorage.setItem('pandanest_admin_token', data.token);
          }
          localStorage.setItem('pandanest_admin_profile', JSON.stringify(userObj));
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Token verification notice:', err.message);
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Method 1: Send OTP to Gmail
  const sendOtp = async (email) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await parseJsonResponse(res, 'Failed to send verification code.');
  };

  // Method 2: Verify OTP & Sign In / Sign Up
  const verifyOtp = async (email, otp, extraDetails = {}) => {
    // extraDetails can be a string (name for backwards compatibility) or an object
    const payload = typeof extraDetails === 'string'
      ? { email, otp, name: extraDetails }
      : { email, otp, ...extraDetails };

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await parseJsonResponse(res, 'Invalid verification code.');

    const userObj = data.user || data.admin;
    localStorage.setItem('pandanest_admin_token', data.token);
    localStorage.setItem('pandanest_admin_profile', JSON.stringify(userObj));
    setToken(data.token);
    setAdmin(userObj);
    return data;
  };

  // Method 1: Google Login / Signup (via ID token or email profile)
  const loginWithGoogle = async (tokenOrPayload, name = '', avatar = '') => {
    let payload = {};
    if (typeof tokenOrPayload === 'object' && tokenOrPayload !== null) {
      payload = tokenOrPayload;
    } else if (typeof tokenOrPayload === 'string') {
      if (tokenOrPayload.includes('@')) {
        payload = { email: tokenOrPayload, name, avatar };
      } else {
        payload = { googleIdToken: tokenOrPayload, name, avatar };
      }
    }

    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await parseJsonResponse(res, 'Failed to authenticate with Google.');

    const userObj = data.user || data.admin;
    localStorage.setItem('pandanest_admin_token', data.token);
    localStorage.setItem('pandanest_admin_profile', JSON.stringify(userObj));
    setToken(data.token);
    setAdmin(userObj);
    return data;
  };

  // Method 4: Password login (Fallback for admin)
  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await parseJsonResponse(res, 'Failed to login with password.');

    const userObj = data.admin || data.user;
    localStorage.setItem('pandanest_admin_token', data.token);
    localStorage.setItem('pandanest_admin_profile', JSON.stringify(userObj));
    setToken(data.token);
    setAdmin(userObj);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pandanest_admin_token');
    localStorage.removeItem('pandanest_admin_profile');
    setToken(null);
    setAdmin(null);
  };

  // Roles derived exclusively from server-issued data — never set client-side
  const isSuperAdmin = admin?.role === 'super_admin';
  const isAdmin = ['super_admin', 'admin'].includes(admin?.role);
  const currentRole = admin?.role || 'user';

  return (
    <AuthContext.Provider
      value={{
        token,
        admin,
        user: admin,
        role: currentRole,
        isSuperAdmin,
        isAdmin,
        isAuthenticated: Boolean(token),
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
