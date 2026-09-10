import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Store,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  IndianRupee,
  FileCheck,
  HardDrive,
  Check,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function AdminDashboard() {
  const { adminUser: user, adminToken: token, logoutAdmin: logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');

  // Form state for creating store
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAdminData = () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');

    Promise.all([
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      }),
      fetch('/api/admin/stores', { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
    ])
      .then(([statsData, storesData]) => {
        setStats(statsData && typeof statsData === 'object' && !statsData.error ? statsData : null);
        setStores(Array.isArray(storesData) ? storesData : []);
      })
      .catch((err) => {
        console.error('Error fetching admin data:', err);
        setErrorMsg('Session expired or unauthorized. Please re-login.');
        if (err.message === 'Unauthorized') {
          logout();
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, slug, username, password, email, phone, address })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create store');

      setShowCreateModal(false);
      setName('');
      setSlug('');
      setUsername('');
      setPassword('');
      setEmail('');
      setPhone('');
      setAddress('');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStoreActive = async (storeId, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) throw new Error('Failed to update store status');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (!window.confirm(`Are you sure you want to delete store "${storeName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete store');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleManualPurge = async () => {
    setPurgeStatus('Running 24-hour cleanup cycle...');
    try {
      const res = await fetch('/api/admin/purge-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPurgeStatus(data.message || 'Auto-purge completed.');
      fetchAdminData();
      setTimeout(() => setPurgeStatus(''), 4000);
    } catch (err) {
      setPurgeStatus('Purge failed: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="clean-card" style={{
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#1c1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(28, 25, 23, 0.2)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Superadmin Platform Control
            </h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Multi-Tenant Store Management & Document Lifecycle
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleManualPurge} title="Trigger 24h document auto-purge">
            <RefreshCw size={15} /> Run 24h Purge
          </button>

          <button className="btn btn-terracotta" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Add New Shopkeeper
          </button>

          <button className="btn btn-danger" onClick={logout} style={{ padding: '8px 14px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {purgeStatus && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#047857',
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={16} /> {purgeStatus}
        </div>
      )}

      {/* Analytics Overview Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="clean-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              <Store size={16} /> REGISTERED SHOPS
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '8px', color: 'var(--text-primary)' }}>
              {stats.totalStores} <span style={{ fontSize: '0.85rem', color: 'var(--accent-forest)', fontWeight: 700 }}>({stats.activeStores} active)</span>
            </div>
          </div>

          <div className="clean-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-forest)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              <IndianRupee size={16} /> TOTAL VOLUME
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-forest)', marginTop: '8px' }}>
              ₹{stats.totalRevenueINR?.toFixed(2)}
            </div>
          </div>

          <div className="clean-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              <FileCheck size={16} /> JOBS PROCESSED
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '8px', color: 'var(--text-primary)' }}>
              {stats.totalOrders}
            </div>
          </div>

          <div className="clean-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              <HardDrive size={16} /> STORAGE IN USE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '8px', color: 'var(--text-primary)' }}>
              {stats.storageUsedMB} MB
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.totalFilesOnDisk} files on disk</span>
          </div>
        </div>
      )}

      {/* Stores List */}
      <div className="clean-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Registered Stores
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading platform stores...</div>
        ) : stores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No stores registered yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stores.map((store) => (
              <div
                key={store.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{store.name}</h3>
                    <span className={`badge ${store.is_active ? 'badge-ready' : 'badge-completed'}`}>
                      {store.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Username: <strong style={{ color: 'var(--text-primary)' }}>{store.username}</strong> • Slug:{' '}
                    <code style={{ background: 'var(--bg-parchment)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--accent-rust)', fontSize: '0.8rem' }}>
                      /print/{store.slug}
                    </code>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {store.address} {store.phone && `• ${store.phone}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Jobs / Volume</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      {store.total_orders} jobs • <span style={{ color: 'var(--accent-forest)' }}>₹{store.revenue_inr?.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStoreActive(store.id, store.is_active)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    {store.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDeleteStore(store.id, store.name)}
                    className="btn btn-danger"
                    style={{ padding: '8px 12px' }}
                    title="Delete store"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Shopkeeper */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create New Shopkeeper</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Store Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Metro Digital Prints"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Store Slug *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="metro-digital"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Login Username *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="metroprint"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Login Password *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="shop@printhub.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Store Counter Address
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ground Floor, Commercial Complex"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-terracotta" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
