import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Separate tokens for shopkeeper and superadmin
  const [shopToken, setShopToken] = useState(() => localStorage.getItem('print_shop_token') || null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('print_admin_token') || null);

  const [shopUser, setShopUser] = useState(() => {
    try {
      const saved = localStorage.getItem('print_shop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('print_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Validate sessions
  useEffect(() => {
    const promises = [];

    if (shopToken) {
      promises.push(
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${shopToken}` } })
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data) => {
            setShopUser(data);
            localStorage.setItem('print_shop_user', JSON.stringify(data));
          })
          .catch(() => {
            setShopToken(null);
            setShopUser(null);
            localStorage.removeItem('print_shop_token');
            localStorage.removeItem('print_shop_user');
          })
      );
    }

    if (adminToken) {
      promises.push(
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } })
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data) => {
            setAdminUser(data);
            localStorage.setItem('print_admin_user', JSON.stringify(data));
          })
          .catch(() => {
            setAdminToken(null);
            setAdminUser(null);
            localStorage.removeItem('print_admin_token');
            localStorage.removeItem('print_admin_user');
          })
      );
    }

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, []);

  // Superadmin Login
  const loginAdmin = async (username, password) => {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');

    setAdminToken(data.token);
    setAdminUser(data.user);
    localStorage.setItem('print_admin_token', data.token);
    localStorage.setItem('print_admin_user', JSON.stringify(data.user));
    return data.user;
  };

  // Shopkeeper Login
  const loginShop = async (username, password) => {
    const res = await fetch('/api/auth/shop-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');

    setShopToken(data.token);
    setShopUser(data.store);
    localStorage.setItem('print_shop_token', data.token);
    localStorage.setItem('print_shop_user', JSON.stringify(data.store));
    return data.store;
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('print_admin_token');
    localStorage.removeItem('print_admin_user');
  };

  const logoutShop = () => {
    setShopToken(null);
    setShopUser(null);
    localStorage.removeItem('print_shop_token');
    localStorage.removeItem('print_shop_user');
  };

  return (
    <AuthContext.Provider
      value={{
        adminToken,
        adminUser,
        shopToken,
        shopUser,
        loading,
        loginAdmin,
        loginShop,
        logoutAdmin,
        logoutShop
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
