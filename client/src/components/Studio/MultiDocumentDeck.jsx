import React, { useState, useEffect } from 'react';
import { DocumentFullPreview } from '../Preview/DocumentFullPreview';
import { SlideToConfirm } from '../UI/SlideToConfirm';
import {
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  Check,
  Info
} from 'lucide-react';

export function MultiDocumentDeck({
  store,
  documents = [],
  onAddFiles,
  onRemoveDocument,
  onUpdateDocumentConfig,
  onSubmitAllOrders,
  submitting
}) {
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [totalQuote, setTotalQuote] = useState(0);
  const [tokenGroupsPreview, setTokenGroupsPreview] = useState([]);

  const currentDoc = documents[activeDocIndex] || documents[0];

  useEffect(() => {
    if (!store?.id || documents.length === 0) {
      setTotalQuote(0);
      setTokenGroupsPreview([]);
      return;
    }

    const groups = {};
    documents.forEach((doc, idx) => {
      const gKey = `${doc.colorMode}_${doc.gsmTierId || 'default'}_${doc.orientation}_${doc.isDuplex}`;
      if (!groups[gKey]) {
        const tier = store.gsmTiers?.find((t) => t.id === doc.gsmTierId) || store.gsmTiers?.[0];
        groups[gKey] = {
          docs: [],
          colorMode: doc.colorMode === 'color' ? 'Full Color' : 'Black & White',
          gsmName: tier?.name || 'Standard',
          orientation: doc.orientation,
          copies: doc.copies || 1
        };
      }
      groups[gKey].docs.push({ ...doc, docIndex: idx + 1 });
    });

    const items = Object.values(groups).map((grp) => ({
      pages: grp.docs.reduce((sum, d) => sum + (d.pageCount || 1), 0),
      colorMode: grp.colorMode === 'Full Color' ? 'color' : 'bw',
      gsmTierId: grp.docs[0]?.gsmTierId,
      copies: grp.copies,
      isDuplex: grp.docs[0]?.isDuplex
    }));

    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: store.id, items })
    })
      .then((r) => r.json())
      .then((data) => {
        setTotalQuote(data.grandTotalINR || 0);
        setTokenGroupsPreview(Object.values(groups));
      })
      .catch((err) => console.error('Error fetching batch quote:', err));
  }, [store?.id, documents]);

  if (documents.length === 0) return null;

  return (
    <div style={{ width: '100%' }}>
      {/* 1. Horizontal Document Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '14px'
      }}>
        {documents.map((doc, idx) => {
          const isActive = activeDocIndex === idx;
          return (
            <div
              key={doc.id || idx}
              onClick={() => setActiveDocIndex(idx)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: isActive ? '#1c1917' : '#ffffff',
                color: isActive ? '#ffffff' : '#57534e',
                border: isActive ? '1px solid #1c1917' : '1px solid #d8d2c6',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(28,25,23,0.15)' : '0 1px 3px rgba(44,38,30,0.05)',
                transition: 'all 0.2s'
              }}
            >
              <FileText size={15} color={isActive ? '#ffffff' : '#78716c'} />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Doc {idx + 1}: {doc.name}
              </span>

              {documents.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDocument(idx);
                    if (activeDocIndex >= documents.length - 1) {
                      setActiveDocIndex(Math.max(0, documents.length - 2));
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? '#d6d3d1' : '#a8a29e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Another Document Button */}
        <label style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '12px',
          background: '#ffffff',
          border: '1.5px dashed #d8d2c6',
          color: '#1c1917',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: 800
        }}>
          <input type="file" multiple accept="*/*" onChange={onAddFiles} style={{ display: 'none' }} />
          <Plus size={15} /> Add Document
        </label>
      </div>

      {/* 2. Full Visual Preview of Active Document */}
      {currentDoc && (
        <div style={{ marginBottom: '16px' }}>
          <DocumentFullPreview
            file={currentDoc.file}
            cameraPhotos={currentDoc.cameraPhotos || []}
            colorMode={currentDoc.colorMode}
            orientation={currentDoc.orientation}
            onPageCountDetected={(cnt) => {
              onUpdateDocumentConfig(activeDocIndex, 'pageCount', cnt);
            }}
          />
        </div>
      )}

      {/* 3. Individual Document Settings Card */}
      {currentDoc && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e4dc',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(44, 38, 30, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1c1917' }}>
              Print Settings for Doc {activeDocIndex + 1}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#78716c', fontWeight: 600 }}>
              {currentDoc.pageCount || 1} page(s)
            </span>
          </div>

          {/* Color Mode Toggle */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: '6px' }}>
              Color Mode
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f5f2eb', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'colorMode', 'bw')}
                style={{
                  padding: '9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: currentDoc.colorMode === 'bw' ? '#1c1917' : 'transparent',
                  color: currentDoc.colorMode === 'bw' ? '#ffffff' : '#57534e',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Black & White (₹{store.pricing?.bw_rate?.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'colorMode', 'color')}
                style={{
                  padding: '9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: currentDoc.colorMode === 'color' ? '#1c1917' : 'transparent',
                  color: currentDoc.colorMode === 'color' ? '#ffffff' : '#57534e',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Full Color (₹{store.pricing?.color_rate?.toFixed(2)})
              </button>
            </div>
          </div>

          {/* Orientation: Portrait vs Landscape */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: '6px' }}>
              Orientation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'orientation', 'portrait')}
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  background: currentDoc.orientation === 'portrait' ? '#1c1917' : '#ffffff',
                  color: currentDoc.orientation === 'portrait' ? '#ffffff' : '#57534e',
                  border: currentDoc.orientation === 'portrait' ? '1px solid #1c1917' : '1px solid #d8d2c6',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'orientation', 'landscape')}
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  background: currentDoc.orientation === 'landscape' ? '#1c1917' : '#ffffff',
                  color: currentDoc.orientation === 'landscape' ? '#ffffff' : '#57534e',
                  border: currentDoc.orientation === 'landscape' ? '1px solid #1c1917' : '1px solid #d8d2c6',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Paper Quality (GSM) */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: '6px' }}>
              Paper Quality (GSM)
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {store.gsmTiers?.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onUpdateDocumentConfig(activeDocIndex, 'gsmTierId', tier.id)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 12px',
                    borderRadius: '10px',
                    background: currentDoc.gsmTierId === tier.id ? '#1c1917' : '#ffffff',
                    color: currentDoc.gsmTierId === tier.id ? '#ffffff' : '#57534e',
                    border: currentDoc.gsmTierId === tier.id ? '1px solid #1c1917' : '1px solid #d8d2c6',
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

          {/* Copies Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.84rem', color: '#1c1917', fontWeight: 700 }}>Number of Copies</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'copies', Math.max(1, (currentDoc.copies || 1) - 1))}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f2eb', border: '1px solid #d8d2c6', color: '#1c1917', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 800 }}
              >
                -
              </button>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', minWidth: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                {currentDoc.copies || 1}
              </span>
              <button
                type="button"
                onClick={() => onUpdateDocumentConfig(activeDocIndex, 'copies', (currentDoc.copies || 1) + 1)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f2eb', border: '1px solid #d8d2c6', color: '#1c1917', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 800 }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Smart Token Grouping Card */}
      <div style={{
        background: '#fdfbf7',
        border: '1px solid #d8d2c6',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1c1917' }}>
            Smart Token Grouping
          </span>
          <span style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 800 }}>
            {tokenGroupsPreview.length} {tokenGroupsPreview.length === 1 ? 'Token Batch' : 'Token Batches'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tokenGroupsPreview.map((grp, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.76rem',
                color: '#57534e',
                background: '#ffffff',
                border: '1px solid #e8e4dc',
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>Token {i + 1}: {grp.docs.map((d) => `Doc ${d.docIndex}`).join(', ')} ({grp.colorMode}, {grp.gsmName})</span>
              <span style={{ color: '#1c1917', fontWeight: 800 }}>{grp.docs.length} file(s)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Tactile Slide to Place Order Slider */}
      <div>
        <SlideToConfirm
          label="Slide to place order"
          amount={totalQuote ? `₹${totalQuote.toFixed(2)}` : ''}
          disabled={submitting || documents.length === 0}
          loading={submitting}
          onConfirm={onSubmitAllOrders}
        />
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#78716c', marginTop: '8px' }}>
          Swipe arrow right to confirm • Documents with identical configs share one Token ID
        </div>
      </div>
    </div>
  );
}
