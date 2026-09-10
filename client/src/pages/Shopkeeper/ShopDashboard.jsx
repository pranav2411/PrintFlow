import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { playNewOrderChime } from '../../utils/audioAlert';
import { SettingsManager } from './SettingsManager';
import { PrintStandeePoster } from './PrintStandeePoster';
import {
  Printer,
  Sliders,
  QrCode,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Eye,
  LogOut,
  Sparkles
} from 'lucide-react';

export function ShopDashboard() {
  const { shopUser: user, shopToken: token, logoutShop: logout } = useAuth();
  const { socket, joinStore } = useSocket();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'settings', 'poster'
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  const printIframeRef = useRef(null);

  // Fetch initial orders
  const fetchOrders = () => {
    fetch('/api/orders/store-queue', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(data);
        }
      })
      .catch((err) => console.error('Error fetching orders:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  // Real-time Socket.io integration
  useEffect(() => {
    if (!user?.id) return;
    joinStore(user.id);

    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      if (soundEnabled) {
        playNewOrderChime();
      }
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdated);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdated);
    };
  }, [socket, user?.id, soundEnabled]);

  // Update order status (Pending -> Printing -> Ready -> Completed)
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  // 1-Click Quick Print Action
  const handleQuickPrint = (order) => {
    if (order.file_deleted) {
      alert('This file was automatically purged after 24 hours.');
      return;
    }

    // Auto update to PRINTING if currently PENDING
    if (order.status === 'PENDING') {
      handleUpdateStatus(order.id, 'PRINTING');
    }

    const printUrl = `/api/orders/${order.id}/print`;

    // Try iframe print first for zero-popup native experience
    if (printIframeRef.current) {
      printIframeRef.current.src = printUrl;
      printIframeRef.current.onload = () => {
        try {
          printIframeRef.current.contentWindow.focus();
          printIframeRef.current.contentWindow.print();
        } catch (e) {
          // Fallback to direct print window
          window.open(printUrl, '_blank');
        }
      };
    } else {
      window.open(printUrl, '_blank');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const printingCount = orders.filter((o) => o.status === 'PRINTING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px', background: 'var(--bg-app)' }}>
      {/* Hidden Iframe for 1-Click System Print Wizard */}
      <iframe
        ref={printIframeRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px' }}
        title="Print Wizard Stream"
      />

      {/* Top Navbar */}
      <header className="no-print clean-card" style={{
        margin: '16px',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderRadius: 'var(--radius-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#1c1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(28, 25, 23, 0.2)'
          }}>
            <Printer size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {user?.name || 'Print Store'}
              </h1>
              <span className="badge badge-ready" style={{ fontSize: '0.68rem' }}>POS Terminal</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Operator: <strong style={{ color: 'var(--text-secondary)' }}>{user?.username}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('queue')}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            Live Queue {pendingCount > 0 && (
              <span style={{
                background: 'var(--accent-terracotta)',
                color: '#ffffff',
                padding: '1px 7px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('settings')}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            <Sliders size={16} /> Pricing & GSM
          </button>

          <button
            className={`btn ${activeTab === 'poster' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('poster')}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            <QrCode size={16} /> Counter QR Standee
          </button>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
            title={soundEnabled ? 'Mute Chime Alerts' : 'Enable Chime Alerts'}
          >
            {soundEnabled ? <Volume2 size={18} color="var(--accent-forest)" /> : <VolumeX size={18} color="var(--text-muted)" />}
          </button>

          <button
            onClick={logout}
            className="btn btn-danger"
            style={{ padding: '8px 14px', fontSize: '0.86rem' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      {activeTab === 'settings' ? (
        <SettingsManager onBack={() => setActiveTab('queue')} />
      ) : activeTab === 'poster' ? (
        <PrintStandeePoster store={user} onBack={() => setActiveTab('queue')} />
      ) : (
        /* Live Orders Queue View */
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div
              className="clean-card"
              onClick={() => setFilterStatus('ALL')}
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                borderColor: filterStatus === 'ALL' ? '#1c1917' : 'var(--border-subtle)',
                borderWidth: filterStatus === 'ALL' ? '2px' : '1px'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>TOTAL ORDERS</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>{orders.length}</div>
            </div>

            <div
              className="clean-card"
              onClick={() => setFilterStatus('PENDING')}
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                borderColor: filterStatus === 'PENDING' ? '#c2410c' : 'var(--border-subtle)',
                borderWidth: filterStatus === 'PENDING' ? '2px' : '1px'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, letterSpacing: '0.04em' }}>PENDING QUEUE</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#c2410c', marginTop: '4px' }}>{pendingCount}</div>
            </div>

            <div
              className="clean-card"
              onClick={() => setFilterStatus('PRINTING')}
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                borderColor: filterStatus === 'PRINTING' ? '#0369a1' : 'var(--border-subtle)',
                borderWidth: filterStatus === 'PRINTING' ? '2px' : '1px'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, letterSpacing: '0.04em' }}>PRINTING NOW</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>{printingCount}</div>
            </div>

            <div
              className="clean-card"
              onClick={() => setFilterStatus('READY')}
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                borderColor: filterStatus === 'READY' ? '#15803d' : 'var(--border-subtle)',
                borderWidth: filterStatus === 'READY' ? '2px' : '1px'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, letterSpacing: '0.04em' }}>READY FOR PICKUP</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>{readyCount}</div>
            </div>
          </div>

          {/* Orders Stream Cards */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading live queue...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="clean-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Clock size={42} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>No orders in this queue</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                When customers scan your counter QR standee, their jobs appear here automatically in real-time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredOrders.map((order) => {
                const isPending = order.status === 'PENDING';
                const isPrinting = order.status === 'PRINTING';
                const isReady = order.status === 'READY';
                const isCompleted = order.status === 'COMPLETED';

                return (
                  <div
                    key={order.id}
                    className="clean-card"
                    style={{
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      borderLeft: isPending
                        ? '5px solid #d97706'
                        : isPrinting
                        ? '5px solid #0284c7'
                        : isReady
                        ? '5px solid #15803d'
                        : '5px solid #a8a29e'
                    }}
                  >
                    {/* Left: Token & Specs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                      {/* Big Token Number */}
                      <div style={{
                        background: 'var(--bg-parchment)',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-medium)',
                        textAlign: 'center',
                        minWidth: '100px'
                      }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em' }}>TOKEN</span>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {order.token_number}
                        </div>
                      </div>

                      {/* Document details */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                            {order.original_filename}
                          </span>
                          <span className={`badge badge-${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                          {order.file_deleted && (
                            <span style={{ fontSize: '0.72rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                              Auto-Purged (24h)
                            </span>
                          )}
                        </div>

                        {/* Specs Pill List */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                          <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600 }}>
                            {order.pages} Page(s)
                          </span>
                          <span style={{
                            background: order.color_mode === 'color' ? '#eff6ff' : 'var(--bg-surface)',
                            color: order.color_mode === 'color' ? '#1d4ed8' : 'var(--text-secondary)',
                            border: order.color_mode === 'color' ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}>
                            {order.color_mode === 'color' ? 'Full Color' : 'Black & White'}
                          </span>
                          <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600 }}>
                            {order.gsm_name || 'Standard Paper'}
                          </span>
                          <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600 }}>
                            {order.copies} {order.copies === 1 ? 'Copy' : 'Copies'}
                          </span>
                          <span style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600 }}>
                            {order.is_duplex ? 'Double-Sided' : 'Single-Sided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Bill & 1-Click Print Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Price Amount */}
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bill Amount</div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-forest)' }}>
                          ₹{order.total_amount_inr?.toFixed(2)}
                        </div>
                      </div>

                      {/* 1-Click Quick Print Button */}
                      <button
                        className="btn btn-terracotta"
                        onClick={() => handleQuickPrint(order)}
                        disabled={order.file_deleted}
                        style={{
                          padding: '10px 18px',
                          fontSize: '0.92rem',
                          fontWeight: 700
                        }}
                        title="Click to trigger system print wizard instantly"
                      >
                        <Printer size={18} /> Quick Print
                      </button>

                      {/* Status Pipeline Buttons */}
                      {isPending && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleUpdateStatus(order.id, 'PRINTING')}
                          style={{ fontSize: '0.84rem' }}
                        >
                          Start Printing
                        </button>
                      )}

                      {isPrinting && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleUpdateStatus(order.id, 'READY')}
                          style={{ fontSize: '0.84rem' }}
                        >
                          <CheckCircle2 size={16} /> Mark Ready
                        </button>
                      )}

                      {isReady && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          style={{ fontSize: '0.84rem' }}
                        >
                          Handed Over
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
