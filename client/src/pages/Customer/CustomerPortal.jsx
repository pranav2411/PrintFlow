import React, { useState, useEffect } from 'react';
import { CameraScanner } from './CameraScanner';
import { TokenTicket } from './TokenTicket';
import {
  UploadCloud,
  Camera,
  FileText,
  Check,
  Layers,
  Palette,
  RotateCw,
  Copy,
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export function CustomerPortal({ storeSlug }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Document state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [cameraPhotos, setCameraPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [filePageCount, setFilePageCount] = useState(1);

  // Configuration options
  const [colorMode, setColorMode] = useState('bw'); // 'bw' or 'color'
  const [selectedGsmId, setSelectedGsmId] = useState('');
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' or 'landscape'
  const [copies, setCopies] = useState(1);
  const [isDuplex, setIsDuplex] = useState(false);

  // Live Price Quote
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // Fetch Store by Slug
  useEffect(() => {
    fetch(`/api/stores/public/${storeSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Print store not found or offline');
        return res.json();
      })
      .then((data) => {
        setStore(data);
        if (data.gsmTiers && data.gsmTiers.length > 0) {
          setSelectedGsmId(data.gsmTiers[0].id);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [storeSlug]);

  // Handle File Input Selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setCameraPhotos([]);
    setUploadedFiles(files);

    const firstFile = files[0];
    if (firstFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(firstFile);
      setPreviewUrl(url);
      setFilePageCount(files.length);
    } else {
      setPreviewUrl(null);
      // Rough initial estimate; backend does accurate pdf-lib count
      setFilePageCount(1);
    }
  };

  // Handle Camera Capture Return
  const handleCameraComplete = (capturedPages) => {
    setShowCamera(false);
    setUploadedFiles([]);
    setCameraPhotos(capturedPages);
    if (capturedPages.length > 0) {
      setPreviewUrl(capturedPages[0]);
      setFilePageCount(capturedPages.length);
    }
  };

  // Re-calculate Live Price Quote when options change
  useEffect(() => {
    if (!store?.id) return;

    const estPages = cameraPhotos.length > 0 ? cameraPhotos.length : Math.max(1, uploadedFiles.length || 1);

    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: store.id,
        pages: estPages,
        colorMode,
        gsmTierId: selectedGsmId,
        copies,
        isDuplex
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setQuote(data);
      })
      .catch((err) => console.error('Error fetching quote:', err));
  }, [store?.id, uploadedFiles, cameraPhotos, colorMode, selectedGsmId, copies, isDuplex]);

  // Submit Order
  const handleSubmitOrder = async () => {
    if (uploadedFiles.length === 0 && cameraPhotos.length === 0) {
      alert('Please upload a document or scan pages with your camera first.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('storeId', store.id);
      formData.append('colorMode', colorMode);
      formData.append('gsmTierId', selectedGsmId);
      formData.append('orientation', orientation);
      formData.append('copies', copies);
      formData.append('isDuplex', isDuplex);

      if (cameraPhotos.length > 0) {
        formData.append('cameraPhotosJson', JSON.stringify(cameraPhotos));
      } else {
        uploadedFiles.forEach((file) => {
          formData.append('documents', file);
        });
      }

      const res = await fetch('/api/orders/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit print order');

      setActiveOrder(data.order);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Connecting to Print Store...</div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="glass-panel" style={{ maxWidth: '480px', margin: '60px auto', padding: '36px 24px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Store Unavailable</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
          {error || 'Unable to locate this print shop. Please scan the counter QR code again.'}
        </p>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <TokenTicket
        order={activeOrder}
        store={store}
        onReset={() => {
          setActiveOrder(null);
          setUploadedFiles([]);
          setCameraPhotos([]);
          setPreviewUrl(null);
        }}
      />
    );
  }

  const hasDocuments = uploadedFiles.length > 0 || cameraPhotos.length > 0;

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '16px' }}>
      {/* Store Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.05em' }}>
              ONLINE AT COUNTER
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '2px' }}>{store.name}</h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{store.address || 'Walk-in Print Station'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>B/W from</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6366f1' }}>₹{store.pricing?.bw_rate?.toFixed(2)}</div>
        </div>
      </div>

      {/* Step 1: Upload or Scan with Camera */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#6366f1', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
          Select Document to Print
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* File Upload Button */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 12px',
            borderRadius: '12px',
            border: '2px dashed rgba(255,255,255,0.15)',
            background: uploadedFiles.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s'
          }}>
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadCloud size={28} color="#818cf8" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>Upload Files</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>PDF, Images, Any format</span>
          </label>

          {/* Camera Scanner Button */}
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 12px',
              borderRadius: '12px',
              border: cameraPhotos.length > 0 ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
              background: cameraPhotos.length > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              textAlign: 'center',
              color: '#fff',
              transition: 'all 0.2s'
            }}
          >
            <Camera size={28} color="#ec4899" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Scan with Camera</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Multi-page auto snap</span>
          </button>
        </div>

        {/* Selected Document Indicator */}
        {hasDocuments && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.86rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600 }}>
              <FileText size={16} />
              {cameraPhotos.length > 0
                ? `${cameraPhotos.length} Page(s) Scanned via Camera`
                : uploadedFiles.length === 1
                ? uploadedFiles[0].name
                : `${uploadedFiles.length} files selected`}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ready</span>
          </div>
        )}
      </div>

      {/* Step 2: Customization & Live Document Preview */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#6366f1', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
          Print Options & Live Preview
        </h2>

        {/* Color Mode Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            COLOR MODE
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setColorMode('bw')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: colorMode === 'bw' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                background: colorMode === 'bw' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Black & White</div>
              <div style={{ fontSize: '0.78rem', color: '#818cf8', marginTop: '2px' }}>₹{store.pricing?.bw_rate?.toFixed(2)} / page</div>
            </button>

            <button
              type="button"
              onClick={() => setColorMode('color')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: colorMode === 'color' ? '2px solid #ec4899' : '1px solid var(--border-subtle)',
                background: colorMode === 'color' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.02)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Full Color</div>
              <div style={{ fontSize: '0.78rem', color: '#f472b6', marginTop: '2px' }}>₹{store.pricing?.color_rate?.toFixed(2)} / page</div>
            </button>
          </div>
        </div>

        {/* Live Visual Preview Simulation Canvas */}
        {previewUrl && (
          <div style={{
            margin: '16px 0',
            padding: '16px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Simulated Print Preview ({colorMode === 'bw' ? 'B&W Grayscale' : 'Color'})</span>
              <span>{orientation.toUpperCase()}</span>
            </div>
            <div style={{
              display: 'inline-block',
              maxHeight: '220px',
              overflow: 'hidden',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              <img
                src={previewUrl}
                alt="Document Preview"
                className={colorMode === 'bw' ? 'preview-bw' : 'preview-color'}
                style={{
                  maxHeight: '200px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  transform: orientation === 'landscape' ? 'rotate(90deg)' : 'none',
                  transition: 'all 0.3s'
                }}
              />
            </div>
          </div>
        )}

        {/* Paper GSM Quality Tiers */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            PAPER GSM QUALITY
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {store.gsmTiers?.map((tier) => (
              <label
                key={tier.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: selectedGsmId === tier.id ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: selectedGsmId === tier.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="radio"
                    name="gsmTier"
                    checked={selectedGsmId === tier.id}
                    onChange={() => setSelectedGsmId(tier.id)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span style={{ fontWeight: 600 }}>{tier.name}</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: tier.extra_cost > 0 ? '#10b981' : '#94a3b8' }}>
                  {tier.extra_cost > 0 ? `+₹${tier.extra_cost.toFixed(2)}/sheet` : 'Standard'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Orientation & Duplex */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              ORIENTATION
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: orientation === 'portrait' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: orientation === 'portrait' ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: orientation === 'landscape' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: orientation === 'landscape' ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Landscape
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              PRINT SIDES
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsDuplex(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: !isDuplex ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: !isDuplex ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setIsDuplex(true)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: isDuplex ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: isDuplex ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Duplex
              </button>
            </div>
          </div>
        </div>

        {/* Copies Counter */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            NUMBER OF COPIES
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setCopies(Math.max(1, copies - 1))}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>
              {copies}
            </span>
            <button
              type="button"
              onClick={() => setCopies(copies + 1)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Transparent Price Receipt & Submit */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>Estimated Total</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>
            ₹{quote?.grandTotalINR?.toFixed(2) || '0.00'}
          </span>
        </div>

        {quote && (
          <div style={{
            fontSize: '0.82rem',
            color: '#94a3b8',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px'
          }}>
            {quote.pages} page(s) × ₹{quote.baseRatePerPage.toFixed(2)} ({quote.colorMode})
            {quote.gsmSurcharge > 0 && ` + ${quote.sheets} sheet(s) × ₹${quote.gsmSurcharge.toFixed(2)} (${quote.gsmTier})`}
            {quote.copies > 1 && ` × ${quote.copies} copies`}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSubmitOrder}
          disabled={!hasDocuments || submitting}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 700,
            opacity: !hasDocuments || submitting ? 0.6 : 1,
            cursor: !hasDocuments || submitting ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? 'Submitting & Generating Token...' : 'Get Token & Print Now'}
        </button>

        <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '10px' }}>
          Anonymous submission. Files are automatically deleted after 24 hours.
        </p>
      </div>

      {/* Real-time Camera Scanner Modal */}
      {showCamera && (
        <CameraScanner
          onComplete={handleCameraComplete}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
