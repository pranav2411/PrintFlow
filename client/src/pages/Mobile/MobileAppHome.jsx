import React, { useState, useEffect } from 'react';
import { StoreRadarMap } from '../../components/Map/StoreRadarMap';
import { BottomSheetDrawer } from '../../components/Drawer/BottomSheetDrawer';
import { InAppQrScanner } from '../../components/Scanner/InAppQrScanner';
import {
  MapPin,
  QrCode,
  Layers,
  Search,
  Printer,
  ShieldCheck,
  User,
  Sliders,
  ExternalLink
} from 'lucide-react';

export function MobileAppHome({ onNavigate, initialStoreSlug }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Nearby Partner Stores
  useEffect(() => {
    fetch('/api/stores/nearby')
      .then((res) => res.json())
      .then((data) => {
        setStores(data);
        // If an initialStoreSlug was provided (e.g. from QR scan link /print/:slug), select it immediately
        if (initialStoreSlug) {
          const match = data.find((s) => s.slug === initialStoreSlug);
          if (match) setSelectedStore(match);
        }
      })
      .catch((err) => console.error('Error fetching nearby stores:', err))
      .finally(() => setLoading(false));
  }, [initialStoreSlug]);

  // Detect Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.log('Using default campus geolocation:', err.message);
          setUserLocation({ lat: 28.6145, lng: 77.2085 });
        },
        { timeout: 5000 }
      );
    } else {
      setUserLocation({ lat: 28.6145, lng: 77.2085 });
    }
  }, []);

  // Handle In-App QR Code Scan Result
  const handleQrScanSuccess = (slug) => {
    setShowQrScanner(false);
    const matched = stores.find(
      (s) => s.slug.toLowerCase() === slug.toLowerCase() || s.id.toLowerCase() === slug.toLowerCase()
    );
    if (matched) {
      setSelectedStore(matched);
    } else {
      // Fetch specifically if newly provisioned
      fetch(`/api/stores/public/${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) setSelectedStore(data);
        })
        .catch(() => alert(`Print store "${slug}" not found.`));
    }
  };

  const handleNewOrderPlaced = (order) => {
    setActiveOrders((prev) => [order, ...prev]);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#09090b'
    }}>
      {/* 1. Fullscreen Dark Interactive Radar Map */}
      <StoreRadarMap
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(store) => setSelectedStore(store)}
        userLocation={userLocation}
      />

      {/* 2. Floating Top Header & Search Bar (Reference Image 1 style) */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'rgba(18, 18, 20, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}
        >
          <Search size={18} color="#71717a" />
          <input
            type="text"
            placeholder="Search partner print shops nearby..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 600,
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        {/* Scan Counter QR Button (Prominent Floating Icon) */}
        <button
          onClick={() => setShowQrScanner(true)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            background: '#ffffff',
            color: '#09090b',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Scan Counter Standee QR"
        >
          <QrCode size={22} color="#09090b" />
        </button>
      </div>

      {/* 3. Bottom Sheet Drawer (Reference Images 1 & 2) */}
      <BottomSheetDrawer
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(store) => setSelectedStore(store)}
        activeOrders={activeOrders}
        onNewOrderPlaced={handleNewOrderPlaced}
      />

      {/* 4. In-App QR Scanner Overlay */}
      {showQrScanner && (
        <InAppQrScanner
          onScanSuccess={handleQrScanSuccess}
          onClose={() => setShowQrScanner(false)}
        />
      )}
    </div>
  );
}
