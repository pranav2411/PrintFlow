import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  RotateCw,
  Eye,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';

// Configure PDF.js worker from CDN or local bundle
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization:', e);
}

export function DocumentFullPreview({
  file,
  cameraPhotos = [],
  colorMode = 'bw',
  orientation = 'portrait',
  onPageCountDetected
}) {
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [isImageFile, setIsImageFile] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [scale, setScale] = useState(1.0);

  // 1. Handle Document Loading (PDF, Image, or Camera Photos)
  useEffect(() => {
    setCurrentPage(1);

    if (cameraPhotos && cameraPhotos.length > 0) {
      setIsImageFile(true);
      setPdfDoc(null);
      setImageSrc(cameraPhotos[0]);
      setTotalPages(cameraPhotos.length);
      if (onPageCountDetected) onPageCountDetected(cameraPhotos.length);
      return;
    }

    if (!file) {
      setPdfDoc(null);
      setIsImageFile(false);
      setImageSrc(null);
      setTotalPages(1);
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      setIsImageFile(false);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const loadedDoc = await pdfjsLib.getDocument(typedArray).promise;
          setPdfDoc(loadedDoc);
          setTotalPages(loadedDoc.numPages);
          if (onPageCountDetected) onPageCountDetected(loadedDoc.numPages);
        } catch (err) {
          console.error('Error loading PDF:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      setIsImageFile(true);
      setPdfDoc(null);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setTotalPages(1);
      if (onPageCountDetected) onPageCountDetected(1);
    } else {
      setIsImageFile(false);
      setPdfDoc(null);
      setTotalPages(1);
    }
  }, [file, cameraPhotos]);

  // Handle Camera Photo Page Switch
  useEffect(() => {
    if (cameraPhotos && cameraPhotos.length > 0) {
      const idx = Math.min(Math.max(0, currentPage - 1), cameraPhotos.length - 1);
      setImageSrc(cameraPhotos[idx]);
    }
  }, [currentPage, cameraPhotos]);

  // 2. Render PDF Page to Canvas
  const renderPdfPage = async (pageNumber, targetCanvas) => {
    if (!pdfDoc || !targetCanvas) return;
    setRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = targetCanvas;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF page:', err);
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPdfPage(currentPage, canvasRef.current);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (isZoomModalOpen && pdfDoc && modalCanvasRef.current) {
      renderPdfPage(currentPage, modalCanvasRef.current);
    }
  }, [isZoomModalOpen, pdfDoc, currentPage]);

  const isLandscape = orientation === 'landscape';
  const filterStyle = colorMode === 'bw' ? 'grayscale(100%) contrast(115%)' : 'none';

  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      {/* Top Preview Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: '#18181b',
        borderRadius: '12px 12px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#a1a1aa' }}>
          <Eye size={15} color="#a1a1aa" />
          <span style={{ fontWeight: 700, color: '#fff' }}>
            Simulated A4 Preview
          </span>
          <span style={{
            background: colorMode === 'bw' ? 'rgba(255,255,255,0.08)' : 'rgba(59, 130, 246, 0.15)',
            color: colorMode === 'bw' ? '#d4d4d8' : '#60a5fa',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700
          }}>
            {colorMode === 'bw' ? 'Black & White' : 'Full Color'}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#a1a1aa',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            textTransform: 'uppercase'
          }}>
            {orientation}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsZoomModalOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '6px'
          }}
          title="Inspect Fullscreen"
        >
          <Maximize2 size={14} /> Expand
        </button>
      </div>

      {/* Main Sheet Canvas Container (Warm Heritage Presentation) */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '0 0 12px 12px',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        overflow: 'hidden'
      }}>
        {/* Physical Paper Sheet Frame (A4 Aspect Ratio) */}
        <div style={{
          background: '#ffffff',
          width: isLandscape ? '250px' : '185px',
          maxWidth: '88%',
          height: isLandscape ? '176px' : '262px',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(44, 38, 30, 0.12), 0 0 0 1px #e8e4dc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {pdfDoc ? (
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: filterStyle,
                transform: isLandscape ? 'rotate(90deg) scale(0.95)' : 'none',
                transition: 'filter 0.2s, transform 0.3s'
              }}
            />
          ) : isImageFile && imageSrc ? (
            <img
              src={imageSrc}
              alt="Document"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: filterStyle,
                transform: isLandscape ? 'rotate(90deg) scale(0.95)' : 'none',
                transition: 'filter 0.2s, transform 0.3s'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#78716c', padding: '16px' }}>
              <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No document loaded</div>
            </div>
          )}
        </div>

        {/* Multi-page Navigation Bar */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '14px',
            background: '#ffffff',
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentPage <= 1 ? '#a8a29e' : '#1c1917',
                cursor: currentPage <= 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentPage >= totalPages ? '#a8a29e' : '#1c1917',
                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Inspection Modal */}
      {isZoomModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 4000, flexDirection: 'column' }}>
          <div style={{
            width: '100%',
            maxWidth: '700px',
            height: '90vh',
            background: '#121214',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#18181b'
            }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                  Document Inspection ({colorMode === 'bw' ? 'Black & White' : 'Color'}, {orientation})
                </span>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block' }}>
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsZoomModalOpen(false)}
                  style={{
                    background: '#27272a',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#09090b'
            }}>
              <div style={{
                background: '#ffffff',
                boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                borderRadius: '4px',
                overflow: 'hidden',
                maxWidth: '90%'
              }}>
                {pdfDoc ? (
                  <canvas
                    ref={modalCanvasRef}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      filter: filterStyle,
                      transform: isLandscape ? 'rotate(90deg)' : 'none'
                    }}
                  />
                ) : imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Inspection View"
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      filter: filterStyle,
                      transform: isLandscape ? 'rotate(90deg)' : 'none'
                    }}
                  />
                ) : null}
              </div>
            </div>

            {/* Modal Footer Controls */}
            {totalPages > 1 && (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                background: '#18181b'
              }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f4f4f5' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
