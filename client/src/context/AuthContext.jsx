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
      const parsed = JSON.parse(saved);
      const email = (parsed?.email || '').toLowerCase().trim();
      if (
        email === 'vishalsingh05072003@gmail.com' ||
        email === 'acubebeauty@gmail.com' ||
        email.startsWith('vishalsingh05072003') ||
        (parsed?.name && parsed.name.toLowerCase().includes('vishalsingh05072003'))
      ) {
        parsed.role = 'super_admin';
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await parseJsonResponse(res);
          const userObj = data.admin || data.user;
          setAdmin(userObj);
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
  }, [token]);

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
  const verifyOtp = async (email, otp, name = '') => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, name })
    });
    const data = await parseJsonResponse(res, 'Invalid verification code.');

    const userObj = data.user || data.admin;
    localStorage.setItem('pandanest_admin_token', data.token);
    localStorage.setItem('pandanest_admin_profile', JSON.stringify(userObj));
    setToken(data.token);
    setAdmin(userObj);
    return data;
  };

  // Method 3: Google Login / Signup
  const loginWithGoogle = async (googleData) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googleData)
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

  const SUPER_ADMIN_EMAILS = ['acubebeauty@gmail.com', 'vishalsingh05072003@gmail.com', 'vishalsingh05072003'];
  const userEmail = (admin?.email || '').toLowerCase().trim();
  const isSuperAdmin = admin?.role === 'super_admin' || SUPER_ADMIN_EMAILS.some(e => userEmail === e || userEmail.startsWith('vishalsingh05072003'));
  const isAdmin = ['super_admin', 'admin'].includes(admin?.role) || isSuperAdmin;
  const currentRole = isSuperAdmin ? 'super_admin' : (admin?.role || 'user');

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
