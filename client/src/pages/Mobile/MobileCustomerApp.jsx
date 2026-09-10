import React, { useState, useEffect } from 'react';
import { StoreRadarMap } from '../../components/Map/StoreRadarMap';
import { MultiDocumentDeck } from '../../components/Studio/MultiDocumentDeck';
import { CameraScanner } from '../Customer/CameraScanner';
import { TokenTicket } from '../Customer/TokenTicket';
import { InAppQrScanner } from '../../components/Scanner/InAppQrScanner';
import {
  MapPin,
  FileText,
  QrCode,
  Clock,
  Search,
  Navigation,
  UploadCloud,
  Camera,
  ArrowRight,
  X,
  Printer,
  List,
  Map,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  CheckCircle2
} from 'lucide-react';

export function MobileCustomerApp({ initialStoreSlug }) {
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'studio', 'scan', 'orders'
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab 1 Sub-views: 'split', 'list'
  const [exploreView, setExploreView] = useState('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const GEOAPIFY_KEY = 'dde88d34825a44a4b6883e59f79f4818';
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Multi-Document Print Studio State
  const [documents, setDocuments] = useState([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrderTicket, setActiveOrderTicket] = useState(null);

  // Orders Tab Filter
  const [orderFilter, setOrderFilter] = useState('all');

  // Geoapify Real-time Address & Location Autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setGeoSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingLocation(true);
      fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(searchQuery)}&apiKey=${GEOAPIFY_KEY}&limit=4`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.features) {
            setGeoSuggestions(data.features);
          }
        })
        .catch((err) => console.warn('Geoapify autocomplete error:', err))
        .finally(() => setIsSearchingLocation(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Nearby Stores
  useEffect(() => {
    fetch('/api/stores/nearby')
      .then((res) => res.json())
      .then((data) => {
        setStores(data);
        if (data.length > 0) {
          if (initialStoreSlug) {
            const match = data.find((s) => s.slug === initialStoreSlug);
            if (match) {
              setSelectedStore(match);
              setActiveTab('studio');
            } else {
              setSelectedStore(data[0]);
            }
          } else {
            setSelectedStore(data[0]);
          }
        }
      })
      .catch((err) => console.error('Error fetching stores:', err))
      .finally(() => setLoading(false));
  }, [initialStoreSlug]);

  // Initial Geolocation lookup
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserLocation({ lat: 28.6145, lng: 77.2085 });
        },
        { timeout: 8000 }
      );
    } else {
      setUserLocation({ lat: 28.6145, lng: 77.2085 });
    }
  }, []);

  // Compute walk distance helper
  const getWalkInfo = (storeLat, storeLng) => {
    if (!userLocation || !storeLat || !storeLng) return { meters: 85, minutes: 2 };
    const R = 6371e3;
    const p1 = (userLocation.lat * Math.PI) / 180;
    const p2 = (storeLat * Math.PI) / 180;
    const dp = ((storeLat - userLocation.lat) * Math.PI) / 180;
    const dl = ((storeLng - userLocation.lng) * Math.PI) / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = Math.round(R * c);
    const minutes = Math.max(1, Math.round(meters / 75));
    return { meters, minutes };
  };

  // QR Scanner success callback
  const handleQrScanSuccess = (slug) => {
    const match = stores.find(
      (s) => s.slug?.toLowerCase() === slug.toLowerCase() || s.id?.toLowerCase() === slug.toLowerCase()
    );
    if (match) {
      setSelectedStore(match);
      setActiveTab('studio');
    } else {
      fetch(`/api/stores/public/${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.id) {
            setSelectedStore(data);
            setActiveTab('studio');
          }
        })
        .catch(() => alert(`Print store "${slug}" not found.`));
    }
  };

  // Multi-Document File Addition
  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const defaultGsm = selectedStore?.gsmTiers?.[0]?.id || '';
    const newDocs = files.map((file, i) => ({
      id: `doc_${Date.now()}_${i}`,
      name: file.name,
      file,
      cameraPhotos: null,
      pageCount: 1,
      colorMode: 'bw',
      gsmTierId: defaultGsm,
      orientation: 'portrait',
      copies: 1,
      isDuplex: false
    }));

    setDocuments((prev) => [...prev, ...newDocs]);
    e.target.value = '';
  };

  // Camera Complete Handler
  const handleCameraComplete = (capturedPages) => {
    setShowCameraModal(false);
    if (!capturedPages || capturedPages.length === 0) return;

    const defaultGsm = selectedStore?.gsmTiers?.[0]?.id || '';
    const newDoc = {
      id: `cam_${Date.now()}`,
      name: `Camera Scan (${capturedPages.length} Pages)`,
      file: null,
      cameraPhotos: capturedPages,
      pageCount: capturedPages.length,
      colorMode: 'bw',
      gsmTierId: defaultGsm,
      orientation: 'portrait',
      copies: 1,
      isDuplex: false,
      isCamera: true
    };

    setDocuments((prev) => [...prev, newDoc]);
  };

  const handleUpdateDocumentConfig = (index, key, val) => {
    setDocuments((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [key]: val };
      }
      return next;
    });
  };

  const handleRemoveDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit All Documents via Smart Token Grouping
  const handleSubmitAllOrders = async () => {
    if (!selectedStore) {
      alert('Please select a print store.');
      return;
    }
    if (documents.length === 0) {
      alert('Please upload a document or capture pages with the camera first.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('storeId', selectedStore.id);

      const configs = [];
      let fileIdx = 0;

      documents.forEach((doc) => {
        if (doc.cameraPhotos && doc.cameraPhotos.length > 0) {
          formData.append('cameraPhotosJson', JSON.stringify(doc.cameraPhotos));
          configs.push({
            isCamera: true,
            colorMode: doc.colorMode,
            gsmTierId: doc.gsmTierId,
            orientation: doc.orientation,
            copies: doc.copies || 1,
            isDuplex: doc.isDuplex || false
          });
        } else if (doc.file) {
          formData.append('documents', doc.file);
          configs.push({
            index: fileIdx,
            colorMode: doc.colorMode,
            gsmTierId: doc.gsmTierId,
            orientation: doc.orientation,
            copies: doc.copies || 1,
            isDuplex: doc.isDuplex || false
          });
          fileIdx++;
        }
      });

      formData.append('documentsConfigJson', JSON.stringify(configs));

      const res = await fetch('/api/orders/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setActiveOrderTicket({
        tokens: data.tokens,
        orders: data.orders,
        primaryOrder: data.primaryOrder
      });

      if (data.orders && Array.isArray(data.orders)) {
        setActiveOrders((prev) => [...data.orders, ...prev]);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getManeuverIcon = (modifier, type) => {
    if (type === 'arrive') return <CheckCircle2 size={18} color="#15803d" />;
    if (modifier && modifier.includes('left')) return <CornerUpLeft size={18} color="#c2410c" />;
    if (modifier && modifier.includes('right')) return <CornerUpRight size={18} color="#c2410c" />;
    return <ArrowUp size={18} color="#c2410c" />;
  };

  const filteredStores = stores.filter((s) => {
    return s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.address.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectLocation = (feature) => {
    const lat = feature.properties.lat;
    const lng = feature.properties.lon;
    if (lat && lng) {
      setUserLocation({ lat, lng });
      setSearchQuery('');
      setGeoSuggestions([]);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '100vw',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-app)',
      color: 'var(--text-primary)',
      position: 'relative'
    }}>
      {/* ============================================================ */}
      {/* MAIN VIEWPORT BODY                                           */}
      {/* ============================================================ */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingBottom: '80px'
      }}>
        {/* ============================================================ */}
        {/* TAB 1: NEARBY PRINTERS & MAP (HERITAGE EDITORIAL)           */}
        {/* ============================================================ */}
        {activeTab === 'map' && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {/* Top Clean Search & View Bar */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 20,
              position: 'relative'
            }}>
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <div style={{
                  height: '42px',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  gap: '8px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search place or shop..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setGeoSuggestions([]);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Geoapify Live Address Autocomplete Dropdown */}
                {geoSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid var(--border-medium)',
                    boxShadow: '0 10px 25px rgba(28, 25, 23, 0.15)',
                    zIndex: 200,
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '6px 12px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-surface)' }}>
                      Locations found via Geoapify
                    </div>
                    {geoSuggestions.map((feat, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectLocation(feat)}
                        style={{
                          padding: '10px 12px',
                          borderBottom: idx < geoSuggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <MapPin size={15} color="var(--accent-terracotta)" style={{ flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {feat.properties.formatted || feat.properties.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {feat.properties.city || feat.properties.state || feat.properties.country}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View Switcher Pills */}
              <div style={{
                display: 'flex',
                background: '#ffffff',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <button
                  onClick={() => setExploreView('split')}
                  style={{
                    background: exploreView === 'split' ? '#1c1917' : 'transparent',
                    color: exploreView === 'split' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 9px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Map size={13} /> Map
                </button>
                <button
                  onClick={() => setExploreView('list')}
                  style={{
                    background: exploreView === 'list' ? '#1c1917' : 'transparent',
                    color: exploreView === 'list' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 9px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <List size={13} /> List
                </button>
              </div>

              {/* Instant Counter QR Button */}
              <button
                onClick={() => setActiveTab('scan')}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}
                title="Scan Shop Counter QR"
              >
                <QrCode size={18} />
              </button>
            </div>

            {/* Split View: Map at Top, Clean Store Cards Below */}
            {exploreView === 'split' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Interactive Map */}
                <div style={{ height: '280px', width: '100%', position: 'relative', flexShrink: 0 }}>
                  <StoreRadarMap
                    stores={stores}
                    selectedStore={selectedStore}
                    onSelectStore={(st) => {
                      setSelectedStore(st);
                      setIsNavigating(false);
                    }}
                    userLocation={userLocation}
                    onLocationUpdate={(coords) => setUserLocation(coords)}
                    onRouteCalculated={(r) => setRouteData(r)}
                  />
                </div>

                {/* Clean Store List / Detail Panel Below Map */}
                <div style={{
                  padding: '16px 14px 40px',
                  maxWidth: '680px',
                  width: '100%',
                  margin: '0 auto'
                }}>
                  {/* Walking Navigation HUD */}
                  {isNavigating && routeData?.steps && routeData.steps.length > 0 ? (
                    <div className="clean-card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Navigation size={18} color="var(--accent-terracotta)" />
                          <span style={{ fontWeight: 800, fontSize: '0.94rem' }}>Directions to {selectedStore?.name}</span>
                        </div>
                        <button
                          onClick={() => setIsNavigating(false)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: 'var(--accent-forest)', fontWeight: 800, marginBottom: '10px' }}>
                        {routeData.distanceMeters} meters • ~{routeData.durationMinutes} min walk
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {routeData.steps.slice(0, 3).map((st, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {getManeuverIcon(st.modifier, st.type)}
                            <span>{st.instruction} ({st.distanceMeters}m)</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setIsNavigating(false);
                          setActiveTab('studio');
                        }}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '11px', fontSize: '0.86rem' }}
                      >
                        <Printer size={16} /> Arrived at Shop • Open Studio
                      </button>
                    </div>
                  ) : selectedStore ? (
                    /* Selected Store Card */
                    <div className="clean-card" style={{ padding: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-terracotta)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                            Selected Print Shop
                          </div>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {selectedStore.name}
                          </h2>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {selectedStore.address}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedStore(null)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Distance & Rate tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '12px 0 16px' }}>
                        <span className="badge badge-ready">
                          {getWalkInfo(selectedStore.lat, selectedStore.lng).meters}m walk
                        </span>
                        <span style={{ background: '#f5f2eb', padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.74rem', color: '#1c1917', fontWeight: 700 }}>
                          B&W: ₹{selectedStore.pricing?.bw_rate?.toFixed(2)}/pg
                        </span>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.74rem', fontWeight: 700 }}>
                          Color: ₹{selectedStore.pricing?.color_rate?.toFixed(2)}/pg
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          onClick={() => setIsNavigating(true)}
                          className="btn btn-secondary"
                          style={{ padding: '11px', fontSize: '0.84rem' }}
                        >
                          <Navigation size={15} color="var(--accent-terracotta)" /> Walk Route
                        </button>

                        <button
                          onClick={() => setActiveTab('studio')}
                          className="btn btn-primary"
                          style={{ padding: '11px', fontSize: '0.84rem' }}
                        >
                          <Printer size={15} /> Print Studio <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Clean list of stores */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Partner Shops ({filteredStores.length})
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tap to select</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredStores.map((st) => {
                          const walk = getWalkInfo(st.lat, st.lng);
                          return (
                            <div
                              key={st.id}
                              onClick={() => setSelectedStore(st)}
                              className="clean-card"
                              style={{
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                                  {st.name}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {walk.meters}m • ~{walk.minutes} min walk • {st.address}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, fontSize: '0.96rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                  ₹{st.pricing?.bw_rate?.toFixed(2) || '2.00'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per page</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* List View: Full-Height Clean Stores View */}
            {exploreView === 'list' && (
              <div style={{
                width: '100%',
                padding: '16px 14px 40px',
                maxWidth: '680px',
                margin: '0 auto'
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Partner Print Shops</h1>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Select a printer to configure and submit your document
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredStores.map((st) => {
                    const walk = getWalkInfo(st.lat, st.lng);
                    return (
                      <div key={st.id} className="clean-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{st.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{st.address}</div>
                          </div>
                          <span className="badge badge-ready">
                            {walk.meters}m walk
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                          <span style={{ background: '#f5f2eb', padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.74rem', fontWeight: 700 }}>
                            B&W: ₹{st.pricing?.bw_rate?.toFixed(2)}/pg
                          </span>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.74rem', fontWeight: 700 }}>
                            Color: ₹{st.pricing?.color_rate?.toFixed(2)}/pg
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedStore(st);
                            setActiveTab('studio');
                          }}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '10px', fontSize: '0.84rem' }}
                        >
                          Select & Open Studio <ArrowRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PRINT STUDIO (WARM HERITAGE EDITORIAL) */}
        {activeTab === 'studio' && (
          <div style={{
            width: '100%',
            padding: '16px 14px 50px',
            maxWidth: '680px',
            margin: '0 auto'
          }}>
            {activeOrderTicket ? (
              <TokenTicket
                order={activeOrderTicket}
                store={selectedStore}
                onReset={() => {
                  setActiveOrderTicket(null);
                  setDocuments([]);
                }}
              />
            ) : (
              <div>
                {/* Store Header Selector */}
                <div className="clean-card" style={{
                  padding: '16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-terracotta)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
                      Selected Print Shop
                    </span>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {selectedStore?.name || 'Select a Print Shop'}
                    </h1>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {selectedStore?.address || 'Counter station'}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('map')}
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                  >
                    Change Shop
                  </button>
                </div>

                {/* Initial Upload State if no documents yet */}
                {documents.length === 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
                    <label style={{
                      padding: '36px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: '#ffffff',
                      border: '1.5px dashed var(--border-medium)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}>
                      <input type="file" multiple accept="*/*" onChange={handleAddFiles} style={{ display: 'none' }} />
                      <UploadCloud size={32} color="var(--accent-terracotta)" style={{ marginBottom: '10px' }} />
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>Upload Files</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, DOCX, Images</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowCameraModal(true)}
                      style={{
                        padding: '36px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: '#ffffff',
                        border: '1.5px dashed var(--border-medium)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <Camera size={32} color="var(--accent-terracotta)" style={{ marginBottom: '10px' }} />
                      <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>Scan Camera</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Multi-page document snap</span>
                    </button>
                  </div>
                ) : (
                  /* Multi-Document Carousel Deck with Full Preview & Slide-to-Confirm */
                  <MultiDocumentDeck
                    store={selectedStore}
                    documents={documents}
                    onAddFiles={handleAddFiles}
                    onRemoveDocument={handleRemoveDocument}
                    onUpdateDocumentConfig={handleUpdateDocumentConfig}
                    onSubmitAllOrders={handleSubmitAllOrders}
                    submitting={submitting}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: DEDICATED FULLSCREEN IN-APP QR SCANNER                */}
        {/* ============================================================ */}
        {activeTab === 'scan' && (
          <InAppQrScanner
            onScanSuccess={handleQrScanSuccess}
            onClose={() => setActiveTab('map')}
          />
        )}

        {/* ============================================================ */}
        {activeTab === 'orders' && (
          <div style={{
            width: '100%',
            padding: '20px 14px 50px',
            maxWidth: '680px',
            margin: '0 auto'
          }}>
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900 }}>My Print Orders</h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Track print tokens and counter pickup receipts
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', overflowX: 'auto' }}>
                {['all', 'pending', 'printing', 'ready'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setOrderFilter(f)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: orderFilter === f ? '#1c1917' : '#ffffff',
                      color: orderFilter === f ? '#ffffff' : 'var(--text-secondary)',
                      border: orderFilter === f ? '1px solid #1c1917' : '1px solid var(--border-medium)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-secondary)' }}>No active prints</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload documents in Print Studio to generate tokens.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeOrders
                  .filter((ord) => orderFilter === 'all' || ord.status?.toLowerCase() === orderFilter)
                  .map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => setActiveOrderTicket({ orders: [ord], tokens: [ord.token_number], primaryOrder: ord })}
                      className="clean-card"
                      style={{ padding: '16px 18px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {ord.token_number}
                        </span>
                        <span className={`badge badge-${ord.status?.toLowerCase() || 'pending'}`}>
                          {ord.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>
                        {ord.original_filename}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>{ord.pages} page(s) • {ord.color_mode === 'color' ? 'Color' : 'B&W'}</span>
                        <strong style={{ color: 'var(--accent-terracotta)', fontSize: '0.92rem' }}>₹{ord.total_amount_inr?.toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SOLID FIXED BOTTOM NAVIGATION BAR                            */}
      {/* ============================================================ */}
      <nav className="fixed-bottom-nav">
        <button
          onClick={() => setActiveTab('map')}
          className={`nav-tab-item ${activeTab === 'map' ? 'active' : ''}`}
        >
          <MapPin size={18} />
          <span>Nearby</span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`nav-tab-item ${activeTab === 'studio' ? 'active' : ''}`}
        >
          <FileText size={18} />
          <span>Print Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('scan')}
          className={`nav-tab-item ${activeTab === 'scan' ? 'active' : ''}`}
        >
          <QrCode size={18} />
          <span>Scan QR</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`nav-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <Clock size={18} />
          <span>Orders {activeOrders.length > 0 && `(${activeOrders.length})`}</span>
        </button>
      </nav>

      {/* Camera Document Scanner Modal */}
      {showCameraModal && (
        <CameraScanner
          onComplete={handleCameraComplete}
          onCancel={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
}
