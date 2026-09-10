import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Printer, ShieldCheck, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export function LoginPage({ targetRole = 'shopkeeper', onLoginSuccess }) {
  const { loginShop, loginAdmin } = useAuth();
  const isSuperadmin = targetRole === 'superadmin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSuperadmin) {
        await loginAdmin(username.trim(), password);
      } else {
        await loginShop(username.trim(), password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div className="clean-card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '36px 28px',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1c1917',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {isSuperadmin ? (
              <ShieldCheck size={26} color="var(--accent-terracotta)" />
            ) : (
              <Printer size={26} color="var(--accent-terracotta)" />
            )}
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {isSuperadmin ? 'Superadmin Portal' : 'Shopkeeper Counter'}
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isSuperadmin
              ? 'Authorized access for platform administrators'
              : 'Sign in to access your real-time print queue'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '11px 14px',
            borderRadius: '10px',
            marginBottom: '18px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} color="#b91c1c" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-field"
                placeholder="Enter secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '8px',
              fontSize: '0.92rem'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href="/"
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ArrowLeft size={13} /> Back to Customer Studio
          </a>
        </div>
      </div>
    </div>
  );
}
