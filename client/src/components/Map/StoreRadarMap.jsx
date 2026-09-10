import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getWalkingRoute } from '../../services/routingService';
import {
  Plus,
  Minus,
  Crosshair,
  Compass,
  Layers,
  Info,
  Check,
  X
} from 'lucide-react';

export function StoreRadarMap({
  stores = [],
  selectedStore,
  onSelectStore,
  userLocation,
  onLocationUpdate,
  onRouteCalculated
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);

  const GEOAPIFY_KEY = 'dde88d34825a44a4b6883e59f79f4818';

  // Map layer: 'geoapify' (Default Crisp Real Streets), 'satellite' (Esri World Imagery), 'osm' (OpenStreetMap), 'voyager' (Editorial)
  const [mapLayer, setMapLayer] = useState('geoapify');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showApiInfoModal, setShowApiInfoModal] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const userLat = userLocation?.lat || 28.6145;
  const userLng = userLocation?.lng || 77.2085;

  // Active GPS Location Request
  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (onLocationUpdate) onLocationUpdate(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 1 });
        }
      },
      (err) => {
        console.warn('Geolocation access error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getTileUrl = (layerKey) => {
    switch (layerKey) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'osm':
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'voyager':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'geoapify':
      default:
        return `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`;
    }
  };

  // 1. Initialize Map with Real Street Tiles (Geoapify Crisp Streets by default)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLat, userLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      });

      const initialLayer = L.tileLayer(getTileUrl('geoapify'), {
        maxZoom: 20,
        subdomains: 'abc'
      }).addTo(map);

      tileLayerRef.current = initialLayer;
      mapInstanceRef.current = map;
    }
  }, []);

  // Switch Tile Layer
  const handleSelectLayer = (newLayer) => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const nextLayer = L.tileLayer(getTileUrl(newLayer), {
      maxZoom: 19,
      subdomains: 'abc'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = nextLayer;
    setMapLayer(newLayer);
    setShowLayerMenu(false);
  };

  // 2. Fetch Walking Route when Store is Selected
  useEffect(() => {
    if (!selectedStore) {
      setRouteData(null);
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      return;
    }

    getWalkingRoute(userLat, userLng, selectedStore.lat, selectedStore.lng)
      .then((data) => {
        setRouteData(data);
        if (onRouteCalculated) onRouteCalculated(data);
      })
      .catch((err) => console.error('Route calculation error:', err));
  }, [selectedStore, userLat, userLng]);

  // 3. Render Markers & Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // User Location Dot with Radar Pulse
    const userIconHtml = `
      <div style="position: relative; width: 26px; height: 26px;">
        <div style="position: absolute; inset: -4px; background: rgba(194, 65, 12, 0.35); border-radius: 50%; animation: radarPing 2s infinite;"></div>
        <div style="position: absolute; inset: 2px; background: rgba(194, 65, 12, 0.2); border-radius: 50%;"></div>
        <div style="position: absolute; top: 5px; left: 5px; width: 16px; height: 16px; background: #c2410c; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 10px rgba(194,65,12,0.6);"></div>
      </div>
    `;

    const userMarker = L.marker([userLat, userLng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: userIconHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      })
    }).addTo(map);
    markersRef.current.push(userMarker);

    // Partner Store Pins (Heritage Light Style)
    stores.forEach((store) => {
      const isSelected = selectedStore?.id === store.id;

      const storeIconHtml = `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          background: ${isSelected ? '#1c1917' : '#ffffff'};
          color: ${isSelected ? '#ffffff' : '#1c1917'};
          padding: 5px 12px;
          border-radius: 999px;
          border: ${isSelected ? '2px solid #c2410c' : '1px solid #d8d2c6'};
          box-shadow: 0 4px 14px rgba(44, 38, 30, 0.18);
          cursor: pointer;
          white-space: nowrap;
          font-family: var(--font-main);
          font-weight: 700;
          font-size: 12px;
          transform: scale(${isSelected ? 1.06 : 1});
          transition: transform 0.2s ease;
        ">
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${isSelected ? '#c2410c' : '#f5f2eb'};
            display: flex;
            align-items: center;
            justifyContent: center;
            color: ${isSelected ? '#ffffff' : '#c2410c'};
          ">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
          </div>
          <span>${store.name}</span>
          <span style="font-size: 10px; opacity: 0.85; background: ${isSelected ? 'rgba(255,255,255,0.2)' : '#f5f2eb'}; padding: 1px 5px; border-radius: 4px;">₹${store.pricing?.bw_rate || 2}</span>
        </div>
      `;

      const marker = L.marker([store.lat, store.lng], {
        icon: L.divIcon({
          className: 'store-radar-marker',
          html: storeIconHtml,
          iconSize: [130, 32],
          iconAnchor: [65, 16]
        })
      }).addTo(map);

      marker.on('click', () => {
        onSelectStore(store);
      });

      markersRef.current.push(marker);
    });

    // Draw Real Walking Route Polyline
    if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
      const polyline = L.polyline(routeData.coordinates, {
        color: '#c2410c',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLineRef.current = polyline;

      map.flyToBounds(L.latLngBounds(routeData.coordinates).pad(0.3), {
        duration: 0.8
      });
    }
  }, [stores, selectedStore, routeData, userLat, userLng]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Leaflet Map DOM */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Controls (Right Side) */}
      <div style={{
        position: 'absolute',
        right: '14px',
        top: '14px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Layer Switcher Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #d8d2c6',
              color: '#1c1917',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(44, 38, 30, 0.12)'
            }}
            title="Switch Map Layers"
          >
            <Layers size={17} />
          </button>

          {/* Layer Menu Dropdown */}
          {showLayerMenu && (
            <div style={{
              position: 'absolute',
              right: '46px',
              top: '0',
              background: '#ffffff',
              border: '1px solid #d8d2c6',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 8px 24px rgba(44, 38, 30, 0.18)',
              minWidth: '170px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#78716c', padding: '4px 8px', textTransform: 'uppercase' }}>
                Real Map Layers
              </div>

              <button
                onClick={() => handleSelectLayer('geoapify')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mapLayer === 'geoapify' ? '#f5f2eb' : 'transparent',
                  color: '#1c1917',
                  fontSize: '0.78rem',
                  fontWeight: mapLayer === 'geoapify' ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Geoapify Crisp Streets</span>
                {mapLayer === 'geoapify' && <Check size={14} color="#c2410c" />}
              </button>

              <button
                onClick={() => handleSelectLayer('osm')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mapLayer === 'osm' ? '#f5f2eb' : 'transparent',
                  color: '#1c1917',
                  fontSize: '0.78rem',
                  fontWeight: mapLayer === 'osm' ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>OpenStreetMap</span>
                {mapLayer === 'osm' && <Check size={14} color="#c2410c" />}
              </button>

              <button
                onClick={() => handleSelectLayer('satellite')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mapLayer === 'satellite' ? '#f5f2eb' : 'transparent',
                  color: '#1c1917',
                  fontSize: '0.78rem',
                  fontWeight: mapLayer === 'satellite' ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Real Satellite (Esri)</span>
                {mapLayer === 'satellite' && <Check size={14} color="#c2410c" />}
              </button>

              <button
                onClick={() => handleSelectLayer('voyager')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mapLayer === 'voyager' ? '#f5f2eb' : 'transparent',
                  color: '#1c1917',
                  fontSize: '0.78rem',
                  fontWeight: mapLayer === 'voyager' ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Editorial (Carto)</span>
                {mapLayer === 'voyager' && <Check size={14} color="#c2410c" />}
              </button>
            </div>
          )}
        </div>

        {/* Free Map API Guide Button */}
        <button
          onClick={() => setShowApiInfoModal(true)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #d8d2c6',
            color: '#c2410c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(44, 38, 30, 0.12)'
          }}
          title="Free Map APIs without credit card"
        >
          <Info size={17} />
        </button>

        {/* GPS Recenter */}
        <button
          onClick={requestLiveLocation}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #d8d2c6',
            color: '#1c1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(44, 38, 30, 0.12)'
          }}
          title="Recenter My Location"
        >
          <Crosshair size={17} />
        </button>

        {/* Zoom Controls */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #d8d2c6',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 3px 12px rgba(44, 38, 30, 0.12)'
        }}>
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            style={{ width: '38px', height: '34px', background: 'transparent', border: 'none', borderBottom: '1px solid #e8e4dc', color: '#1c1917', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Plus size={15} />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            style={{ width: '38px', height: '34px', background: 'transparent', border: 'none', color: '#1c1917', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Minus size={15} />
          </button>
        </div>
      </div>

      {/* Free Map API Guide Modal (No Card Required) */}
      {showApiInfoModal && (
        <div className="modal-backdrop" onClick={() => setShowApiInfoModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              border: '1px solid #d8d2c6',
              boxShadow: '0 16px 40px rgba(44, 38, 30, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="#c2410c" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1c1917' }}>
                  100% Free Real Maps (No Card / Autopay)
                </h3>
              </div>
              <button
                onClick={() => setShowApiInfoModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#57534e', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f5f2eb', padding: '12px 14px', borderRadius: '12px' }}>
                <strong style={{ color: '#1c1917' }}>1. OpenStreetMap (Active Now)</strong>
                <p style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                  Already running! Shows real world street names, roads, landmarks, and building outlines globally. Requires <strong>NO credit card, NO bank details, and NO account</strong>.
                </p>
              </div>

              <div style={{ background: '#f5f2eb', padding: '12px 14px', borderRadius: '12px' }}>
                <strong style={{ color: '#1c1917' }}>2. Esri ArcGIS Satellite (Active Now)</strong>
                <p style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                  Real high-resolution satellite aerial photography. Free public REST service. <strong>Zero credit card or billing</strong> required.
                </p>
              </div>

              <div style={{ background: '#f5f2eb', padding: '12px 14px', borderRadius: '12px' }}>
                <strong style={{ color: '#1c1917' }}>3. OSRM Walking Navigation (Active Now)</strong>
                <p style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                  Calculates walking routes, ETA, and turn-by-turn navigation in-app with <strong>zero sign-up and zero credit card</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowApiInfoModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px', padding: '10px' }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
