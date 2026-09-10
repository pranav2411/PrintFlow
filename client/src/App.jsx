import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { MobileCustomerApp } from './pages/Mobile/MobileCustomerApp';
import { ShopDashboard } from './pages/Shopkeeper/ShopDashboard';
import { AdminDashboard } from './pages/SuperAdmin/AdminDashboard';
import { LoginPage } from './pages/Auth/LoginPage';

function AppContent() {
  const { adminUser, shopUser, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#a1a1aa', background: '#09090b', minHeight: '100vh' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading PrintFlow...</div>
      </div>
    );
  }

  // 1. DEDICATED SUPERADMIN ROUTE: /admin
  if (currentPath.startsWith('/admin')) {
    if (!adminUser || adminUser.role !== 'superadmin') {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
          <LoginPage
            targetRole="superadmin"
            onLoginSuccess={() => navigateTo('/admin')}
          />
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <AdminDashboard />
      </div>
    );
  }

  // 2. DEDICATED SHOPKEEPER POS TERMINAL ROUTE: /store or /store/*
  if (currentPath.startsWith('/store')) {
    if (!shopUser || shopUser.role !== 'shopkeeper') {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
          <LoginPage
            targetRole="shopkeeper"
            onLoginSuccess={() => navigateTo('/store/dashboard')}
          />
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <ShopDashboard />
      </div>
    );
  }

  // 3. DEDICATED CUSTOMER MOBILE WEB APPLICATION: / or /print/:storeSlug
  // Strictly isolated: NO POS or Admin buttons visible to customers
  const printMatch = currentPath.match(/^\/print\/([a-zA-Z0-9_-]+)/);
  const initialStoreSlug = printMatch ? printMatch[1] : null;

  return (
    <MobileCustomerApp
      initialStoreSlug={initialStoreSlug}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
