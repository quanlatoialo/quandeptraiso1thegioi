'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const data = await apiRequest('/api/wallet');
      setWallet(data.wallet);
    } catch {
      setWallet(null);
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await apiRequest('/api/notifications/unread-count');
      setUnreadCount(data.unread || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const u = await fetchUser();
      if (u) {
        await Promise.all([fetchWallet(), fetchUnread()]);
      }
      setLoading(false);
    }
    init();
  }, [fetchUser, fetchWallet, fetchUnread]);

  // Periodic polling for notifications & wallet if logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchUnread();
      fetchWallet();
    }, 15000); // every 15s
    return () => clearInterval(interval);
  }, [user, fetchUnread, fetchWallet]);

  const login = async (email, password) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    await Promise.all([fetchWallet(), fetchUnread()]);
    return res.user;
  };

  const register = async (email, password, displayName) => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    setUser(res.user);
    await Promise.all([fetchWallet(), fetchUnread()]);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setWallet(null);
      setUnreadCount(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        unreadCount,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchUser,
        refreshWallet: fetchWallet,
        refreshUnread: fetchUnread,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
