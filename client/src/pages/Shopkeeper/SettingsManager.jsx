import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, Plus, Trash2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export function SettingsManager({ onBack }) {
  const { shopToken: token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Pricing State
  const [bwRate, setBwRate] = useState(2.0);
  const [colorRate, setColorRate] = useState(10.0);
  const [duplexDiscount, setDuplexDiscount] = useState(0.5);

  // GSM Tiers State
  const [gsmTiers, setGsmTiers] = useState([]);

  // Fetch Current Settings
  useEffect(() => {
    fetch('/api/stores/my-store', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.pricing) {
          setBwRate(data.pricing.bw_rate);
          setColorRate(data.pricing.color_rate);
          setDuplexDiscount(data.pricing.duplex_discount || 0);
        }
        if (data.gsmTiers) {
          setGsmTiers(data.gsmTiers);
        }
      })
      .catch((err) => console.error('Error fetching settings:', err))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAddTier = () => {
    const newTier = {
      id: `gsm_${Date.now()}`,
      name: 'New Paper Quality',
      weight_gsm: 80,
      extra_cost: 2.0
    };
    setGsmTiers([...gsmTiers, newTier]);
  };

  const handleUpdateTier = (index, field, value) => {
    const updated = [...gsmTiers];
    updated[index] = { ...updated[index], [field]: value };
    setGsmTiers(updated);
  };

  const handleDeleteTier = (index) => {
    setGsmTiers(gsmTiers.filter((_, i) => i !== index));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      // 1. Save pricing
      const pRes = await fetch('/api/stores/my-pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bw_rate: parseFloat(bwRate),
          color_rate: parseFloat(colorRate),
          duplex_discount: parseFloat(duplexDiscount)
        })
      });
      if (!pRes.ok) throw new Error('Failed to update pricing rates');

      // 2. Save GSM tiers
      const gRes = await fetch('/api/stores/my-gsm-tiers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gsmTiers })
      });
      if (!gRes.ok) throw new Error('Failed to update GSM tiers');

      setSuccessMsg('Settings updated successfully! Customers scanning the QR code will see new rates immediately.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading store settings...</div>;
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Live Queue
        </button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Store Pricing & Paper GSM Settings
        </h1>
      </div>

      {successMsg && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#047857',
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSaveAll}>
        {/* Base Page Pricing */}
        <div className="clean-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Base Printing Rates (₹ INR)
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set your shop's standard rate per page for Black & White and Full Color prints.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Black & White Rate (₹ / page)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                className="input-field"
                value={bwRate}
                onChange={(e) => setBwRate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Full Color Rate (₹ / page)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input-field"
                value={colorRate}
                onChange={(e) => setColorRate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Duplex (Back Page) Discount (₹)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                value={duplexDiscount}
                onChange={(e) => setDuplexDiscount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Paper GSM Quality Tiers */}
        <div className="clean-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>
                Paper GSM Quality Tiers
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Define the paper qualities your shop stocks and any extra charge per sheet.
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleAddTier}>
              <Plus size={16} /> Add GSM Tier
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gsmTiers.map((tier, idx) => (
              <div
                key={tier.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1.2fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tier Name</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    value={tier.name}
                    onChange={(e) => handleUpdateTier(idx, 'name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Weight (GSM)</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    value={tier.weight_gsm}
                    onChange={(e) => handleUpdateTier(idx, 'weight_gsm', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Extra Cost (₹/sheet)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    value={tier.extra_cost}
                    onChange={(e) => handleUpdateTier(idx, 'extra_cost', e.target.value)}
                    required
                  />
                </div>

                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteTier(idx)}
                    style={{ padding: '9px 12px' }}
                    title="Delete tier"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" className="btn btn-terracotta" disabled={saving} style={{ padding: '12px 28px', fontSize: '0.96rem' }}>
            <Save size={18} /> {saving ? 'Saving Changes...' : 'Save Pricing & Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
