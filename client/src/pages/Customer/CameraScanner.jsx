import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Trash2, Sliders, Sparkles } from 'lucide-react';

export function CameraScanner({ onComplete, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPages, setCapturedPages] = useState([]);
  const [enhancedMode, setEnhancedMode] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize camera
  useEffect(() => {
    let activeStream = null;
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // prefer back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError('Unable to access camera. Please allow camera permissions or upload an image file instead.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Snap page from video stream
  const capturePage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply document contrast enhancement filter if enabled
    if (enhancedMode) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      // High-contrast document enhancement
      for (let i = 0; i < data.length; i += 4) {
        // grayscale conversion
        const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Contrast curve: push darks darker, lights lighter for text clarity
        const contrast = 1.3;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const enhanced = Math.min(255, Math.max(0, factor * (v - 128) + 128));

        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPages((prev) => [...prev, dataUrl]);

    setTimeout(() => {
      setIsCapturing(false);
    }, 200);
  };

  const removePage = (index) => {
    setCapturedPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (capturedPages.length === 0) return;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onComplete(capturedPages);
  };

  return (
    <div className="camera-scanner-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="#6366f1" />
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
            Document Camera Scanner
          </span>
          <span className="badge badge-printing" style={{ marginLeft: '6px' }}>
            {capturedPages.length} {capturedPages.length === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        <button
          onClick={onCancel}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera Viewfinder */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#090d16'
      }}>
        {cameraError ? (
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '380px' }}>
            <p style={{ color: '#fb7185', marginBottom: '16px', fontSize: '0.95rem' }}>{cameraError}</p>
            <button className="btn btn-secondary" onClick={onCancel}>
              Back to File Upload
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: 'scale(1)'
              }}
            />

            {/* Document Outline Guide overlay */}
            <div style={{
              position: 'absolute',
              width: '80%',
              maxWidth: '380px',
              height: '75%',
              border: '2px dashed rgba(99, 102, 241, 0.6)',
              borderRadius: '12px',
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                background: 'rgba(0,0,0,0.6)',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                Align document inside frame
              </span>
            </div>

            {/* Hidden canvas for snapshot capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}
      </div>

      {/* Captured Pages Strip */}
      {capturedPages.length > 0 && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          {capturedPages.map((pageData, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: '56px',
                height: '74px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '2px solid #6366f1'
              }}
            >
              <img
                src={pageData}
                alt={`Page ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                fontSize: '0.65rem',
                padding: '1px 4px',
                borderRadius: '3px'
              }}>
                P.{index + 1}
              </span>
              <button
                onClick={() => removePage(index)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'rgba(244, 63, 94, 0.9)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(10, 15, 28, 0.98)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Toggle Doc Enhancement */}
        <button
          onClick={() => setEnhancedMode(!enhancedMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: enhancedMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.06)',
            color: enhancedMode ? '#818cf8' : '#94a3b8',
            border: `1px solid ${enhancedMode ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
        >
          <Sparkles size={16} />
          {enhancedMode ? 'Enhance: ON' : 'Enhance: OFF'}
        </button>

        {/* Snap Button */}
        <button
          onClick={capturePage}
          disabled={isCapturing || Boolean(cameraError)}
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'white',
            border: '4px solid #6366f1',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isCapturing ? 'scale(0.9)' : 'scale(1)',
            transition: 'all 0.15s'
          }}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#6366f1'
          }} />
        </button>

        {/* Finish & Done */}
        <button
          className="btn btn-primary"
          onClick={handleFinish}
          disabled={capturedPages.length === 0}
          style={{
            opacity: capturedPages.length === 0 ? 0.5 : 1,
            cursor: capturedPages.length === 0 ? 'not-allowed' : 'pointer',
            padding: '10px 18px'
          }}
        >
          <Check size={18} />
          Done ({capturedPages.length})
        </button>
      </div>
    </div>
  );
}
