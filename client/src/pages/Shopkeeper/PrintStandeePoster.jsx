import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Wifi, Globe, Sparkles, ArrowLeft, Check, Edit3 } from 'lucide-react';

export function PrintStandeePoster({ store, onBack }) {
  const [networkIp, setNetworkIp] = useState('');
  const [publicOrigin, setPublicOrigin] = useState('');
  const [customHost, setCustomHost] = useState(() => {
    return localStorage.getItem('printflow_custom_domain') || '';
  });

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  // Selected mode: 'auto_hosted' (if on live web), 'wifi' (if on local dev), 'custom'
  const [selectedHostType, setSelectedHostType] = useState(isLocalhost ? 'wifi' : 'auto_hosted');

  useEffect(() => {
    fetch('/api/system-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.localIp) setNetworkIp(data.localIp);
        if (data.publicOrigin && !data.publicOrigin.includes('localhost')) {
          setPublicOrigin(data.publicOrigin);
        }
      })
      .catch((err) => console.warn('Could not fetch system info:', err));
  }, []);

  const handleCustomHostChange = (val) => {
    setCustomHost(val);
    localStorage.setItem('printflow_custom_domain', val);
  };

  // Compute the live target URL dynamically based on hosting environment
  const getTargetUrl = () => {
    const slug = store?.slug || 'campus-print';

    // 1. Explicit Custom Host override if selected
    if (selectedHostType === 'custom' && customHost.trim()) {
      const cleanHost = customHost.trim().replace(/\/+$/, '');
      const prefix = cleanHost.startsWith('http') ? cleanHost : `https://${cleanHost}`;
      return `${prefix}/print/${slug}`;
    }

    // 2. Wi-Fi IP Mode (For local development testing with real phone on same Wi-Fi)
    if (selectedHostType === 'wifi' && networkIp) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `${window.location.protocol}//${networkIp}${port}/print/${slug}`;
    }

    // 3. Auto-detected Hosted Live Domain (Default when deployed on Render, Railway, VPS, etc.)
    if (!isLocalhost) {
      return `${window.location.origin}/print/${slug}`;
    }

    // 4. If running locally and publicOrigin was supplied via environment
    if (publicOrigin) {
      return `${publicOrigin}/print/${slug}`;
    }

    // 5. Fallback for localhost testing
    if (networkIp) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `${window.location.protocol}//${networkIp}${port}/print/${slug}`;
    }

    return `${window.location.origin}/print/${slug}`;
  };

  const targetUrl = getTargetUrl();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Controls Header (Hidden in Print) */}
      <div className="no-print clean-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <button className="btn btn-terracotta" onClick={handlePrint}>
            <Printer size={16} /> Print Counter Standee Poster
          </button>
        </div>

        {/* Dynamic Host Selector */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              QR Destination URL Engine:
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedHostType('auto_hosted')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: selectedHostType === 'auto_hosted' ? '#1c1917' : '#ffffff',
                  color: selectedHostType === 'auto_hosted' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Globe size={13} /> Live Hosted Domain {!isLocalhost && '(Detected)'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedHostType('wifi')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: selectedHostType === 'wifi' ? '#1c1917' : '#ffffff',
                  color: selectedHostType === 'wifi' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Wifi size={13} /> Local Wi-Fi IP {networkIp ? `(${networkIp})` : ''}
              </button>

              <button
                type="button"
                onClick={() => setSelectedHostType('custom')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: selectedHostType === 'custom' ? '#1c1917' : '#ffffff',
                  color: selectedHostType === 'custom' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={13} /> Custom Domain
              </button>
            </div>
          </div>

          {selectedHostType === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="https://yourprintwebsite.com"
                value={customHost}
                onChange={(e) => handleCustomHostChange(e.target.value)}
                className="input-field"
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.84rem' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Saved for your prints
              </span>
            </div>
          )}

          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Encoded Target: <code style={{ color: 'var(--accent-terracotta)', fontWeight: 800 }}>{targetUrl}</code>
          </div>
        </div>
      </div>

      {/* Printable Counter Poster Card (Warm Heritage Aesthetic) */}
      <div
        className="printable-standee-container"
        style={{
          background: '#ffffff',
          color: '#1c1917',
          borderRadius: '20px',
          padding: '44px 36px',
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(44, 38, 30, 0.15)',
          border: '3px solid #1c1917',
          maxWidth: '520px',
          margin: '0 auto'
        }}
      >
        {/* Top Header Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f5f2eb',
          color: '#1c1917',
          padding: '6px 18px',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '18px',
          border: '1px solid #d8d2c6'
        }}>
          <Sparkles size={15} color="#c2410c" /> Self-Service Print Counter
        </div>

        {/* Store Name */}
        <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#1c1917', marginBottom: '6px' }}>
          {store.name}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#57534e', marginBottom: '26px' }}>
          Scan with your phone camera to upload & print instantly
        </p>

        {/* High-Resolution QR Code */}
        <div style={{
          display: 'inline-block',
          padding: '20px',
          background: '#ffffff',
          borderRadius: '20px',
          border: '2px solid #e8e4dc',
          boxShadow: '0 8px 24px rgba(44, 38, 30, 0.08)',
          marginBottom: '26px'
        }}>
          <QRCodeSVG
            value={targetUrl}
            size={230}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{
          background: '#fbf9f5',
          borderRadius: '16px',
          padding: '20px 18px',
          textAlign: 'left',
          marginBottom: '24px',
          border: '1px solid #e8e4dc'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              background: '#c2410c',
              color: '#ffffff',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.78rem',
              flexShrink: 0
            }}>1</span>
            <div style={{ fontSize: '0.88rem', color: '#1c1917' }}>
              <strong>Point phone camera at QR</strong> to open the print studio.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              background: '#c2410c',
              color: '#ffffff',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.78rem',
              flexShrink: 0
            }}>2</span>
            <div style={{ fontSize: '0.88rem', color: '#1c1917' }}>
              <strong>Upload documents or snap photos</strong>, choose B/W or Color, and slide to confirm.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{
              background: '#c2410c',
              color: '#ffffff',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.78rem',
              flexShrink: 0
            }}>3</span>
            <div style={{ fontSize: '0.88rem', color: '#1c1917' }}>
              <strong>Show your Token Number</strong> at the desk to collect printouts.
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
          Direct Link: <span style={{ color: '#c2410c', fontWeight: 700 }}>{targetUrl}</span>
        </div>
      </div>
    </div>
  );
}
