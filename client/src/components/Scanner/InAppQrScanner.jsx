import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Camera, Image, Store, AlertCircle, ArrowRight } from 'lucide-react';

export function InAppQrScanner({ onScanSuccess, onClose }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [stores, setStores] = useState([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Fetch active partner stores for instant 1-tap fallback
  useEffect(() => {
    fetch('/api/stores/nearby')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
      })
      .catch((err) => console.warn('Could not fetch nearby stores:', err));
  }, []);

  const parseQrText = (decodedText) => {
    console.log('QR Code scanned:', decodedText);
    let slug = decodedText;

    const urlMatch = decodedText.match(/\/print\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      slug = urlMatch[1];
    } else if (decodedText.startsWith('http')) {
      try {
        const parsed = new URL(decodedText);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          slug = parts[parts.length - 1];
        }
      } catch (e) {}
    }

    return slug;
  };

  // 1. Try starting live camera if available (HTTPS or localhost)
  useEffect(() => {
    const qrDiv = document.getElementById('qr-reader-viewport');
    if (!qrDiv) return;

    let html5QrCode = null;
    try {
      html5QrCode = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = html5QrCode;
    } catch (e) {
      console.warn('Html5Qrcode init error:', e);
    }

    // Check if live camera stream is supported by browser
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && html5QrCode) {
      const config = {
        fps: 10,
        qrbox: (w, h) => {
          const size = Math.min(w, h, 240);
          return { width: size, height: size };
        },
        aspectRatio: 1.0
      };

      html5QrCode
        .start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const slug = parseQrText(decodedText);
            html5QrCode
              .stop()
              .then(() => onScanSuccess(slug))
              .catch(() => onScanSuccess(slug));
          },
          () => {}
        )
        .then(() => {
          setIsLiveActive(true);
        })
        .catch((err) => {
          console.warn('Live camera stream not permitted or insecure origin:', err);
          setErrorMsg('Live camera streaming is restricted on this network. Please use the camera shutter button below.');
        });
    } else {
      setErrorMsg('Direct video streaming requires HTTPS. Use the camera shutter button below to snap the QR code.');
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, [onScanSuccess]);

  // 2. Universal Phone Camera Shutter & Gallery Scanner (Works 100% on HTTP & all phones)
  const handlePhotoScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningPhoto(true);
    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader-viewport');
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      const slug = parseQrText(decodedText);
      onScanSuccess(slug);
    } catch (err) {
      console.warn('Photo scan decode failed:', err);
      alert('Could not detect a QR code in that photo. Please point your camera closer to the standee QR code and try again.');
    } finally {
      setScanningPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      paddingBottom: '90px'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={20} color="var(--accent-terracotta)" />
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
            Scan Store QR Standee
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Scanner Body */}
      <div style={{ padding: '18px 16px', maxWidth: '520px', width: '100%', margin: '0 auto' }}>
        {/* Hidden Camera Shutter & Gallery Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoScan}
          style={{ display: 'none' }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoScan}
          style={{ display: 'none' }}
        />

        {/* Live Camera Viewport Frame */}
        <div style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#1c1917',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '16px',
          border: '1px solid var(--border-medium)'
        }}>
          <div id="qr-reader-viewport" style={{ width: '100%', maxWidth: '340px' }} />

          {/* If live camera is not running, show friendly shutter overlay */}
          {!isLiveActive && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#ffffff' }}>
              <Camera size={36} color="#ea580c" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>
                {scanningPhoto ? 'Analyzing QR Code...' : 'Tap to Snap Standee QR'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d6d3d1', marginBottom: '14px' }}>
                Works smoothly on any phone camera
              </div>
              <button
                type="button"
                disabled={scanningPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-terracotta"
                style={{ padding: '10px 20px', fontSize: '0.88rem' }}
              >
                <Camera size={16} /> Open Phone Camera
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons for Phone Scanning */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            disabled={scanningPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-terracotta"
            style={{ padding: '12px 10px', fontSize: '0.84rem' }}
          >
            <Camera size={16} /> Snap Counter QR
          </button>

          <button
            type="button"
            disabled={scanningPhoto}
            onClick={() => galleryInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ padding: '12px 10px', fontSize: '0.84rem' }}
          >
            <Image size={16} /> Choose Photo
          </button>
        </div>

        {/* Quick 1-Tap Partner Store Selector Fallback */}
        <div className="clean-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Store size={18} color="var(--accent-terracotta)" />
            <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Or Select Your Counter Station
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stores.map((st) => (
              <div
                key={st.id}
                onClick={() => onScanSuccess(st.slug || st.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {st.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {st.address}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                >
                  Print Here <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
