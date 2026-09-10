import React, { useState, useEffect } from 'react';
import { SlideToConfirm } from '../UI/SlideToConfirm';
import { CameraScanner } from '../../pages/Customer/CameraScanner';
import { TokenTicket } from '../../pages/Customer/TokenTicket';
import {
  Printer,
  Navigation,
  UploadCloud,
  Camera,
  FileText,
  Clock,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export function BottomSheetDrawer({
  stores = [],
  selectedStore,
  onSelectStore,
  activeOrders = [],
  onNewOrderPlaced
}) {
  const [sheetState, setSheetState] = useState('half'); // 'peek', 'half', 'full'
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby', 'active'
  const [showCamera, setShowCamera] = useState(false);

  // Print Studio Form State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [cameraPhotos, setCameraPhotos] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [colorMode, setColorMode] = useState('bw');
  const [selectedGsmId, setSelectedGsmId] = useState('');
  const [orientation, setOrientation] = useState('portrait');
  const [copies, setCopies] = useState(1);
  const [isDuplex, setIsDuplex] = useState(false);
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentOrderTicket, setCurrentOrderTicket] = useState(null);

  // Automatically expand to full when a store is selected
  useEffect(() => {
    if (selectedStore) {
      setSheetState('full');
      if (selectedStore.gsmTiers && selectedStore.gsmTiers.length > 0) {
        setSelectedGsmId(selectedStore.gsmTiers[0].id);
      }
    }
  }, [selectedStore]);

  // Handle File Input
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setCameraPhotos([]);
    setUploadedFiles(files);
    const firstFile = files[0];
    if (firstFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(firstFile));
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle Camera Capture
  const handleCameraComplete = (capturedPages) => {
    setShowCamera(false);
    setUploadedFiles([]);
    setCameraPhotos(capturedPages);
    if (capturedPages.length > 0) {
      setPreviewUrl(capturedPages[0]);
    }
  };

  // Re-calculate Live Price Quote
  useEffect(() => {
    if (!selectedStore?.id) return;
    const estPages = cameraPhotos.length > 0 ? cameraPhotos.length : Math.max(1, uploadedFiles.length || 1);

    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: selectedStore.id,
        pages: estPages,
        colorMode,
        gsmTierId: selectedGsmId,
        copies,
        isDuplex
      })
    })
      .then((res) => res.json())
      .then((data) => setQuote(data))
      .catch((err) => console.error('Quote error:', err));
  }, [selectedStore?.id, uploadedFiles, cameraPhotos, colorMode, selectedGsmId, copies, isDuplex]);

  // Submit via Swipe-to-Confirm
  const handleConfirmOrder = async () => {
    if (!selectedStore) return;
    if (uploadedFiles.length === 0 && cameraPhotos.length === 0) {
      alert('Please upload a file or take photos with your camera first.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('storeId', selectedStore.id);
      formData.append('colorMode', colorMode);
      formData.append('gsmTierId', selectedGsmId);
      formData.append('orientation', orientation);
      formData.append('copies', copies);
      formData.append('isDuplex', isDuplex);

      if (cameraPhotos.length > 0) {
        formData.append('cameraPhotosJson', JSON.stringify(cameraPhotos));
      } else {
        uploadedFiles.forEach((file) => formData.append('documents', file));
      }

      const res = await fetch('/api/orders/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit order');

      setCurrentOrderTicket(data.order);
      if (onNewOrderPlaced) onNewOrderPlaced(data.order);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSheetHeight = () => {
    if (sheetState === 'peek') return '100px';
    if (sheetState === 'half') return '48vh';
    return '85vh';
  };

  const hasDocuments = uploadedFiles.length > 0 || cameraPhotos.length > 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: getSheetHeight(),
        background: '#121214',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        borderTopLeftRadius: '28px',
        borderTopRightRadius: '28px',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.7)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}
    >
      {/* Top Drag Handle & Toggle */}
      <div
        onClick={() => {
          if (sheetState === 'full') setSheetState('half');
          else if (sheetState === 'half') setSheetState('full');
          else setSheetState('half');
        }}
        style={{
          padding: '12px',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{ width: '42px', height: '5px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.25)' }} />
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
        {/* If viewing a Token Ticket */}
        {currentOrderTicket ? (
          <TokenTicket
            order={currentOrderTicket}
            store={selectedStore}
            onReset={() => {
              setCurrentOrderTicket(null);
              setUploadedFiles([]);
              setCameraPhotos([]);
              setPreviewUrl(null);
              onSelectStore(null);
              setSheetState('half');
            }}
          />
        ) : selectedStore ? (
          /* FULL PRINT STUDIO FOR SELECTED STORE */
          <div>
            {/* Header with back/close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selected Store
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{selectedStore.name}</h2>
                <div style={{ fontSize: '0.78rem', color: '#71717a' }}>{selectedStore.address}</div>
              </div>

              <button
                onClick={() => {
                  onSelectStore(null);
                  setSheetState('half');
                }}
                style={{
                  background: '#27272a',
                  border: 'none',
                  color: '#fff',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Acquisition: File Upload or Camera */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <label style={{
                padding: '16px 12px',
                borderRadius: '16px',
                background: uploadedFiles.length > 0 ? '#27272a' : '#18181b',
                border: uploadedFiles.length > 0 ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                textAlign: 'center'
              }}>
                <input type="file" multiple accept="*/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <UploadCloud size={24} color="#f4f4f5" style={{ marginBottom: '6px' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Upload File</span>
                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>PDF, DOCX, Images</span>
              </label>

              <button
                type="button"
                onClick={() => setShowCamera(true)}
                style={{
                  padding: '16px 12px',
                  borderRadius: '16px',
                  background: cameraPhotos.length > 0 ? '#27272a' : '#18181b',
                  border: cameraPhotos.length > 0 ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                <Camera size={24} color="#f43f5e" style={{ marginBottom: '6px' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Camera Scan</span>
                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Multi-page snap</span>
              </button>
            </div>

            {hasDocuments && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f4f4f5', fontWeight: 600 }}>
                  <FileText size={16} color="#10b981" />
                  {cameraPhotos.length > 0 ? `${cameraPhotos.length} Camera Pages` : uploadedFiles[0]?.name}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Ready to Print</span>
              </div>
            )}

            {/* Color Mode Segmented Bar */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#09090b', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setColorMode('bw')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colorMode === 'bw' ? '#27272a' : 'transparent',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Black & White (₹{selectedStore.pricing?.bw_rate?.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colorMode === 'color' ? '#27272a' : 'transparent',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Full Color (₹{selectedStore.pricing?.color_rate?.toFixed(2)})
                </button>
              </div>
            </div>

            {/* Simulated Live Preview */}
            {previewUrl && (
              <div style={{
                background: '#09090b',
                borderRadius: '14px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.74rem', color: '#71717a', marginBottom: '6px' }}>
                  Simulated Print Preview ({colorMode === 'bw' ? 'Grayscale' : 'Color'})
                </div>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={colorMode === 'bw' ? 'preview-bw' : 'preview-color'}
                  style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                />
              </div>
            )}

            {/* Paper GSM Options */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '6px' }}>
                PAPER QUALITY (GSM)
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {selectedStore.gsmTiers?.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedGsmId(tier.id)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: selectedGsmId === tier.id ? '#ffffff' : '#18181b',
                      color: selectedGsmId === tier.id ? '#09090b' : '#a1a1aa',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {tier.name} {tier.extra_cost > 0 && `(+₹${tier.extra_cost})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies Counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 600 }}>Number of Copies</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#27272a', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  -
                </button>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', minWidth: '24px', textAlign: 'center' }}>
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#27272a', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Tactile "Slide to Confirm" Slider */}
            <div style={{ marginTop: '8px' }}>
              <SlideToConfirm
                label="Slide to place order"
                amount={quote?.grandTotalINR ? `₹${quote.grandTotalINR.toFixed(2)}` : ''}
                disabled={!hasDocuments || submitting}
                loading={submitting}
                onConfirm={handleConfirmOrder}
              />
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#71717a', marginTop: '8px' }}>
                Swipe arrow right to confirm • Receive instant Token ID
              </div>
            </div>
          </div>
        ) : (
          /* NEARBY STORES & ACTIVE PRINTS LIST */
          <div>
            {/* Minimalist Tabs (Reference Image 1 style) */}
            <div style={{
              display: 'flex',
              background: '#09090b',
              padding: '4px',
              borderRadius: '14px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setActiveTab('nearby')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'nearby' ? '#27272a' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Printers near you ({stores.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'active' ? '#27272a' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                My active prints {activeOrders.length > 0 && `(${activeOrders.length})`}
              </button>
            </div>

            {activeTab === 'nearby' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => onSelectStore(store)}
                    style={{
                      background: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '18px',
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{store.name}</h3>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px' }}>
                        {store.address}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '4px' }}>
                        B/W from <strong style={{ color: '#fff' }}>₹{store.pricing?.bw_rate?.toFixed(2)}</strong> • Color from ₹{store.pricing?.color_rate?.toFixed(2)}
                      </div>
                    </div>

                    <button
                      style={{
                        background: '#ffffff',
                        color: '#09090b',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Print Here
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* ACTIVE PRINTS TRACKER (Reference Image 2 style) */
              <div>
                {activeOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
                    <ShoppingBag size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.9rem' }}>No active prints right now.</p>
                    <p style={{ fontSize: '0.75rem' }}>Select a partner printer to submit a document.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeOrders.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          background: '#18181b',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '18px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                            {ord.token_number}
                          </span>
                          <span className={`badge badge-${ord.status.toLowerCase()}`}>
                            {ord.status}
                          </span>
                        </div>

                        {/* Minimalist Transit Progress Line (Reference Image 2) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#09090b',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          color: '#a1a1aa'
                        }}>
                          <Printer size={16} color="#ef4444" />
                          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative' }}>
                            <div style={{
                              height: '100%',
                              background: '#ef4444',
                              width: ord.status === 'READY' ? '100%' : ord.status === 'PRINTING' ? '60%' : '20%',
                              transition: 'width 0.4s'
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, color: ord.status === 'READY' ? '#10b981' : '#fff' }}>
                            {ord.status === 'READY' ? 'Ready at Desk!' : ord.status === 'PRINTING' ? 'Printing' : 'In Queue'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
