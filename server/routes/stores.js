const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireShopkeeper } = require('../middleware/auth');

// List all active partner stores for the map & directory
router.get('/nearby', (req, res) => {
  const stores = db.getAllStores().filter((s) => s.is_active);
  const storesWithDetails = stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    phone: store.phone,
    address: store.address,
    currency: store.currency || 'INR',
    lat: store.lat || 28.6139,
    lng: store.lng || 77.2090,
    pricing: db.getStorePricing(store.id),
    gsmTiers: db.getStoreGsmTiers(store.id)
  }));
  res.json(storesWithDetails);
});

// Public Store Details by Slug (Accessed by customer mobile scan)
router.get('/public/:slug', (req, res) => {
  const { slug } = req.params;
  const store = db.getStoreBySlug(slug);

  if (!store) {
    return res.status(404).json({ error: 'Print Store not found. Please check the QR code or link.' });
  }

  if (!store.is_active) {
    return res.status(403).json({ error: 'This print store is currently offline. Please check with the counter.' });
  }

  const pricing = db.getStorePricing(store.id);
  const gsmTiers = db.getStoreGsmTiers(store.id);

  res.json({
    id: store.id,
    name: store.name,
    slug: store.slug,
    phone: store.phone,
    address: store.address,
    currency: store.currency || 'INR',
    pricing,
    gsmTiers
  });
});

// Authenticated Shopkeeper: Get My Store Profile
router.get('/my-store', requireShopkeeper, (req, res) => {
  const store = db.getStoreById(req.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const pricing = db.getStorePricing(store.id);
  const gsmTiers = db.getStoreGsmTiers(store.id);

  res.json({
    store,
    pricing,
    gsmTiers
  });
});

// Authenticated Shopkeeper: Update Pricing
router.put('/my-pricing', requireShopkeeper, (req, res) => {
  const { bw_rate, color_rate, duplex_discount } = req.body;

  const bw = parseFloat(bw_rate);
  const color = parseFloat(color_rate);
  const duplex = parseFloat(duplex_discount) || 0;

  if (isNaN(bw) || isNaN(color) || bw < 0 || color < 0) {
    return res.status(400).json({ error: 'Valid numeric prices are required' });
  }

  const updatedPricing = db.updateStorePricing(req.storeId, {
    bw_rate: bw,
    color_rate: color,
    duplex_discount: duplex
  });

  res.json({ message: 'Pricing updated successfully', pricing: updatedPricing });
});

// Authenticated Shopkeeper: Update GSM Tiers
router.put('/my-gsm-tiers', requireShopkeeper, (req, res) => {
  const { gsmTiers } = req.body;

  if (!Array.isArray(gsmTiers)) {
    return res.status(400).json({ error: 'gsmTiers must be an array of tiers' });
  }

  // Sanitize
  const sanitized = gsmTiers.map((tier, idx) => ({
    id: tier.id || `gsm_${Date.now()}_${idx}`,
    name: tier.name || `${tier.weight_gsm || 70} GSM Paper`,
    weight_gsm: parseInt(tier.weight_gsm, 10) || 70,
    extra_cost: Math.max(0, parseFloat(tier.extra_cost) || 0)
  }));

  const savedTiers = db.setStoreGsmTiers(req.storeId, sanitized);
  res.json({ message: 'GSM Paper Qualities updated successfully', gsmTiers: savedTiers });
});

// Authenticated Shopkeeper: Update Profile
router.put('/my-profile', requireShopkeeper, (req, res) => {
  const { name, phone, address } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;

  const updatedStore = db.updateStore(req.storeId, updates);
  res.json({ message: 'Store profile updated', store: updatedStore });
});

module.exports = router;
