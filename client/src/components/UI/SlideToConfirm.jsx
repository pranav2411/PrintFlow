import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, Check } from 'lucide-react';

export function SlideToConfirm({
  onConfirm,
  label = 'Slide to confirm print',
  amount = '',
  disabled = false,
  loading = false
}) {
  const containerRef = useRef(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const startXRef = useRef(0);

  const getContainerWidth = () => {
    return containerRef.current ? containerRef.current.clientWidth - 56 : 250;
  };

  const handleStart = (clientX) => {
    if (disabled || isConfirmed || loading) return;
    setIsDragging(true);
    startXRef.current = clientX - (dragProgress * getContainerWidth());
  };

  const handleMove = (clientX) => {
    if (!isDragging || isConfirmed || loading) return;
    const maxDrag = getContainerWidth();
    const currentX = clientX - startXRef.current;
    const progress = Math.min(1, Math.max(0, currentX / maxDrag));
    setDragProgress(progress);

    if (progress >= 0.90 && !isConfirmed) {
      setIsConfirmed(true);
      setIsDragging(false);
      setDragProgress(1);
      try {
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (e) {}
      onConfirm();
    }
  };

  const handleEnd = () => {
    if (isConfirmed) return;
    setIsDragging(false);
    setDragProgress(0);
  };

  // Touch Events
  const onTouchStart = (e) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Mouse Events
  const onMouseDown = (e) => {
    handleStart(e.clientX);
    const onMouseMove = (moveEvent) => handleMove(moveEvent.clientX);
    const onMouseUp = () => {
      handleEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!loading && !disabled && isConfirmed) {
      const t = setTimeout(() => {
        setIsConfirmed(false);
        setDragProgress(0);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [loading, disabled, isConfirmed]);

  const thumbOffset = dragProgress * getContainerWidth();

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '56px',
        borderRadius: '28px',
        background: '#1c1917',
        border: '1px solid #383430',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(28, 25, 23, 0.25)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      {/* Fill bar behind thumb */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${thumbOffset + 54}px`,
          background: isConfirmed ? '#15803d' : 'linear-gradient(90deg, #c2410c 0%, #ea580c 100%)',
          borderRadius: '28px',
          transition: isDragging ? 'none' : 'width 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
        }}
      />

      {/* Center Label */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          fontSize: '0.88rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.02em',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: 1 - dragProgress * 0.7
        }}
      >
        {loading ? (
          'Submitting Order...'
        ) : isConfirmed ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
            <Check size={18} /> Order Confirmed!
          </span>
        ) : (
          <>
            <span>{label}</span>
            {amount && <strong style={{ color: '#fed7aa', fontWeight: 800 }}>({amount})</strong>}
          </>
        )}
      </div>

      {/* Swipeable Thumb Pill */}
      <div
        style={{
          position: 'absolute',
          left: '3px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: '#ffffff',
          color: '#1c1917',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(0,0,0,0.3)',
          transform: `translateX(${thumbOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          zIndex: 3,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {isConfirmed ? (
          <Check size={22} color="#15803d" />
        ) : (
          <ChevronsRight size={24} color="#c2410c" />
        )}
      </div>
    </div>
  );
}
