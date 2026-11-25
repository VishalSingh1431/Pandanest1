import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [token, setToken] = useState(() => localStorage.getItem('pn_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-portal/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPermissions(data.permissions);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginWithSession = (userData, userToken, userPermissions) => {
    localStorage.setItem('pn_admin_token', userToken);
    setToken(userToken);
    setUser(userData);
    setPermissions(userPermissions);
  };

  const logout = () => {
    localStorage.removeItem('pn_admin_token');
    setToken(null);
    setUser(null);
    setPermissions({});
    setLoading(false);
  };

  const isSuperAdmin = () => user?.role === 'super_admin';

  const canView = (pageKey) => {
    if (isSuperAdmin()) return true;
    if (permissions === 'ALL_EDIT') return true;
    const level = permissions[pageKey];
    return level === 'view' || level === 'edit';
  };

  const canEdit = (pageKey) => {
    if (isSuperAdmin()) return true;
    if (permissions === 'ALL_EDIT') return true;
    return permissions[pageKey] === 'edit';
  };

  const getAccessLevel = (pageKey) => {
    if (isSuperAdmin()) return 'edit';
    if (permissions === 'ALL_EDIT') return 'edit';
    return permissions[pageKey] || 'none';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        loading,
        loginWithSession,
        logout,
        isSuperAdmin,
        canView,
        canEdit,
        getAccessLevel,
        refreshUser: fetchCurrentUser,
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
