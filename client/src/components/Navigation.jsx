import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Printer, ShieldAlert, User, QrCode, Home, LogOut } from 'lucide-react';

export function Navigation({ currentPath, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <nav className="no-print" style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand */}
        <div
          onClick={() => onNavigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 900
          }}>
            <Printer size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            Print<span style={{ color: '#818cf8' }}>Flow</span>
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${currentPath === '/' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('/')}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <Home size={14} /> Home
          </button>

          <button
            className={`btn ${currentPath.startsWith('/print') ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('/print/campus-print')}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <QrCode size={14} /> Customer Scan
          </button>

          <button
            className={`btn ${currentPath.startsWith('/store') ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('/store/dashboard')}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <Printer size={14} /> Shopkeeper POS
          </button>

          <button
            className={`btn ${currentPath.startsWith('/admin') ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('/admin')}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <ShieldAlert size={14} /> Superadmin
          </button>

          {user && (
            <button
              className="btn btn-danger"
              onClick={logout}
              style={{ padding: '6px 10px', fontSize: '0.8rem', marginLeft: '6px' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
