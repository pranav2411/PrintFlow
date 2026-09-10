import React from 'react';
import {
  QrCode,
  Printer,
  Camera,
  ShieldCheck,
  Zap,
  Sparkles,
  Clock,
  ArrowRight,
  IndianRupee,
  Layers,
  CheckCircle2
} from 'lucide-react';

export function LandingPage({ onNavigate }) {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '999px',
          color: '#818cf8',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '20px'
        }}>
          <Sparkles size={16} /> Multi-Tenant Smart QR Print Store Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          marginBottom: '18px',
          letterSpacing: '-0.02em'
        }}>
          Scan. Preview. <span style={{
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Get Token.</span> Print.
        </h1>

        <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '680px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Transform walk-in document printing. Customers scan the counter QR code, upload any file format or snap physical pages with their phone camera, see a live simulated preview, and get an anonymous token in seconds.
        </p>
      </div>

      {/* Interactive Portal Launcher Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '48px'
      }}>
        {/* Customer Experience Card */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <QrCode size={26} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Walk-in Customer Portal</h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Scan store QR code from your phone, upload any file format or capture multiple pages using the real-time camera scanner, choose B/W or Color, paper GSM, and get a Token ID.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('/print/campus-print')}
              style={{ justifyContent: 'space-between', padding: '12px 18px' }}
            >
              <span>Scan Campus Print Hub (₹2 B/W)</span>
              <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('/print/metro-xerox')}
              style={{ justifyContent: 'space-between', padding: '12px 18px' }}
            >
              <span>Scan Metro Xerox (₹2.50 B/W)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Shopkeeper Dashboard Card */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Printer size={26} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Shopkeeper POS Dashboard</h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Live real-time incoming orders with audio chime, <strong>1-Click Quick Print Wizard</strong>, custom paper GSM quality rates, and ready-to-print counter QR standees.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onNavigate('/store/dashboard')}
            style={{
              padding: '12px 18px',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            }}
          >
            <span>Open Shopkeeper Terminal</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Superadmin Platform Card */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#f472b6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Superadmin Platform</h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Master SaaS control. Create, update, deactivate, and delete store accounts, monitor volume in ₹ INR, and oversee 24h file auto-purge lifecycle.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('/admin')}
            style={{ padding: '12px 18px', justifyContent: 'space-between' }}
          >
            <span>Superadmin Control Hub</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Architecture Highlights Grid */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>
          Engineered for Print Store Operations
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Camera size={22} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Real-Time Camera Scanner</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                Multi-page document capture directly inside the mobile browser with high-contrast text enhancement.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Printer size={22} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>1-Click Print Wizard</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                Store operators just click "Quick Print" to immediately trigger the native browser print dialog.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Clock size={22} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>24-Hour File Auto-Purge</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                Customer uploaded files are permanently unlinked and deleted 24 hours after completion.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <IndianRupee size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Paper GSM & Transparent Rates</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                Dynamic ₹ calculation factoring page count, GSM paper weight, copies, and duplex discounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
