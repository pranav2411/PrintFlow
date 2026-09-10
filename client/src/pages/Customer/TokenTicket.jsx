import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { playNewOrderChime } from '../../utils/audioAlert';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, Printer, ShoppingBag, ArrowLeft, FileText, Layers, Check } from 'lucide-react';

export function TokenTicket({ order, store, onReset }) {
  const initialOrders = Array.isArray(order)
    ? order
    : order?.orders
    ? order.orders
    : order?.primaryOrder
    ? (order.orders || [order.primaryOrder])
    : order
    ? [order]
    : [];

  const [orders, setOrders] = useState(initialOrders);
  const [activeIdx, setActiveIdx] = useState(0);
  const { socket, joinOrder } = useSocket();

  const currentOrder = orders[activeIdx] || orders[0] || {};
  const grandTotal = orders.reduce((sum, o) => sum + (o.total_amount_inr || 0), 0);

  useEffect(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });
  }, []);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    orders.forEach((ord) => {
      if (ord.id) joinOrder(ord.id);
    });

    if (!socket) return;

    const handleStatusUpdate = (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
      if (updatedOrder.status === 'READY') {
        playNewOrderChime();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 }
        });
      }
    };

    socket.on('order_status_updated', handleStatusUpdate);

    return () => {
      socket.off('order_status_updated', handleStatusUpdate);
    };
  }, [socket, orders.map((o) => o.id).join(',')]);

  const steps = [
    { key: 'PENDING', label: 'In Queue', icon: Clock },
    { key: 'PRINTING', label: 'Printing', icon: Printer },
    { key: 'READY', label: 'Ready for Pickup', icon: CheckCircle2 }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'PRINTING': return 1;
      case 'READY': return 2;
      case 'COMPLETED': return 3;
      default: return 0;
    }
  };

  const activeIndex = getStepIndex(currentOrder.status);

  return (
    <div style={{
      maxWidth: '540px',
      margin: '0 auto',
      padding: '24px 16px',
      textAlign: 'center',
      position: 'relative'
    }}>
      {/* Store Header */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
          {store?.name || 'Partner Print Shop'}
        </span>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1c1917', marginTop: '4px' }}>
          Order Confirmed
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#57534e' }}>
          Present your token number at the counter to collect your prints.
        </p>
      </div>

      {/* Multiple Token Selector Tabs */}
      {orders.length > 1 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e4dc',
          borderRadius: '14px',
          padding: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(44, 38, 30, 0.05)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#78716c', fontWeight: 800, marginBottom: '6px', textAlign: 'left', paddingLeft: '6px' }}>
            Smart Token Batches ({orders.length} Tokens Generated)
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {orders.map((ord, idx) => {
              const isSelected = activeIdx === idx;
              return (
                <button
                  key={ord.id || idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isSelected ? '#1c1917' : '#f5f2eb',
                    color: isSelected ? '#ffffff' : '#57534e',
                    border: isSelected ? '1px solid #1c1917' : '1px solid #e8e4dc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                    {ord.token_number}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                    {ord.color_mode === 'color' ? 'Color' : 'B&W'} • ₹{ord.total_amount_inr?.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Token Hero Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e8e4dc',
        borderRadius: '20px',
        padding: '26px 20px',
        marginBottom: '20px',
        boxShadow: '0 6px 24px rgba(44, 38, 30, 0.08)'
      }}>
        <div style={{ fontSize: '0.76rem', color: '#78716c', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {orders.length > 1 ? `Token ${activeIdx + 1} of ${orders.length}` : 'Your Token Number'}
        </div>

        <div style={{
          fontSize: '3.6rem',
          fontWeight: 900,
          letterSpacing: '0.04em',
          color: '#1c1917',
          fontFamily: 'var(--font-mono)',
          margin: '6px 0 10px'
        }}>
          {currentOrder.token_number}
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f5f2eb',
          border: '1px solid #e8e4dc',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          color: '#57534e'
        }}>
          <span>Amount:</span>
          <strong style={{ color: '#c2410c', fontSize: '1rem', fontWeight: 900 }}>
            ₹{currentOrder.total_amount_inr?.toFixed(2)}
          </strong>
        </div>
      </div>

      {/* Live Order Status Stepper */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '18px 16px',
        marginBottom: '20px',
        border: '1px solid #e8e4dc',
        boxShadow: '0 2px 8px rgba(44, 38, 30, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          marginBottom: '10px'
        }}>
          {/* Track line */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '20px',
            right: '20px',
            height: '2px',
            background: '#e8e4dc',
            zIndex: 1
          }}>
            <div style={{
              height: '100%',
              background: '#1c1917',
              width: `${(Math.min(activeIndex, 2) / 2) * 100}%`,
              transition: 'width 0.4s ease'
            }} />
          </div>

          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = activeIndex > idx;
            const isCurrent = activeIndex === idx;

            return (
              <div key={step.key} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCurrent ? '#1c1917' : isCompleted ? '#15803d' : '#f5f2eb',
                  color: isCurrent || isCompleted ? '#ffffff' : '#78716c',
                  border: `1.5px solid ${isCurrent ? '#1c1917' : isCompleted ? '#15803d' : '#d8d2c6'}`,
                  transition: 'all 0.3s'
                }}>
                  <Icon size={16} />
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  marginTop: '6px',
                  fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent ? '#1c1917' : isCompleted ? '#15803d' : '#78716c'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {currentOrder.status === 'READY' && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            padding: '10px',
            marginTop: '12px',
            color: '#047857',
            fontWeight: 800,
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> Print ready! Collect at counter.
          </div>
        )}
      </div>

      {/* Active Token Specification Card */}
      <div style={{
        textAlign: 'left',
        background: '#ffffff',
        border: '1px solid #e8e4dc',
        borderRadius: '14px',
        padding: '16px',
        fontSize: '0.84rem',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(44, 38, 30, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#78716c' }}>Document(s)</span>
          <span style={{ fontWeight: 700, color: '#1c1917', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentOrder.original_filename}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#78716c' }}>Color Mode</span>
          <span style={{ fontWeight: 700, color: '#1c1917' }}>
            {currentOrder.color_mode === 'color' ? 'Full Color' : 'Black & White'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#78716c' }}>Paper Quality</span>
          <span style={{ fontWeight: 700, color: '#1c1917' }}>
            {currentOrder.gsm_name || 'Standard GSM'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#78716c' }}>Orientation</span>
          <span style={{ fontWeight: 700, color: '#1c1917', textTransform: 'capitalize' }}>
            {currentOrder.orientation || 'Portrait'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#78716c' }}>Pages & Copies</span>
          <span style={{ fontWeight: 700, color: '#1c1917' }}>
            {currentOrder.pages} Page(s) × {currentOrder.copies} {currentOrder.copies === 1 ? 'Copy' : 'Copies'}
          </span>
        </div>

        {orders.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e8e4dc', paddingTop: '10px', marginTop: '10px' }}>
            <span style={{ fontWeight: 800, color: '#78716c' }}>All Tokens Combined</span>
            <span style={{ fontWeight: 900, color: '#c2410c', fontSize: '0.95rem' }}>
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="btn btn-secondary"
        style={{ width: '100%', padding: '12px' }}
      >
        <ArrowLeft size={16} /> Print Another Document
      </button>
    </div>
  );
}
