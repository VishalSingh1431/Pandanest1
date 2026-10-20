import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pandanest_admin_token') || null);
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('pandanest_admin_profile');
      return saved ? JSON.parse(saved) : null;
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
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Token verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    localStorage.setItem('pandanest_admin_token', data.token);
    localStorage.setItem('pandanest_admin_profile', JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pandanest_admin_token');
    localStorage.removeItem('pandanest_admin_profile');
    setToken(null);
    setAdmin(null);
  };

  const isSuperAdmin = admin?.role === 'super_admin';
  const isAdmin = ['super_admin', 'admin'].includes(admin?.role);

  return (
    <AuthContext.Provider
      value={{
        token,
        admin,
        role: admin?.role || 'user',
        isSuperAdmin,
        isAdmin,
        isAuthenticated: Boolean(token),
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
