const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { requireSuperadmin } = require('../middleware/auth');
const { runPurgeNow } = require('../services/cleanupService');
const { UPLOADS_DIR } = require('../middleware/upload');

router.use(requireSuperadmin);

// Admin Platform Analytics
router.get('/stats', (req, res) => {
  const stores = db.getAllStores();
  const orders = db.getAllOrders();

  const totalStores = stores.length;
  const activeStores = stores.filter((s) => s.is_active).length;
  const totalOrders = orders.length;

  const totalRevenueINR = orders.reduce((sum, o) => sum + (o.total_amount_inr || 0), 0);
  const totalPagesPrinted = orders.reduce((sum, o) => sum + ((o.pages || 1) * (o.copies || 1)), 0);

  // Storage metrics
  let totalDiskBytes = 0;
  let totalFilesOnDisk = 0;
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    totalFilesOnDisk = files.length;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(UPLOADS_DIR, f));
        totalDiskBytes += stat.size;
      } catch (err) {
        // file might have been unlinked
      }
    }
  }

  const storageUsedMB = Math.round((totalDiskBytes / (1024 * 1024)) * 100) / 100;

  res.json({
    totalStores,
    activeStores,
    totalOrders,
    totalRevenueINR: Math.round(totalRevenueINR * 100) / 100,
    totalPagesPrinted,
    totalFilesOnDisk,
    storageUsedMB
  });
});

// List all stores
router.get('/stores', (req, res) => {
  const stores = db.getAllStores();
  const orders = db.getAllOrders();

  // Attach aggregated store stats
  const storesWithStats = stores.map((store) => {
    const storeOrders = orders.filter((o) => o.store_id === store.id);
    const revenue = storeOrders.reduce((sum, o) => sum + (o.total_amount_inr || 0), 0);
    const pages = storeOrders.reduce((sum, o) => sum + ((o.pages || 1) * (o.copies || 1)), 0);
    const pricing = db.getStorePricing(store.id);

    return {
      ...store,
      total_orders: storeOrders.length,
      revenue_inr: Math.round(revenue * 100) / 100,
      pages_printed: pages,
      pricing
    };
  });

  res.json(storesWithStats);
});

// Create new shopkeeper / store
router.post('/stores', (req, res) => {
  const { name, slug, username, password, email, phone, address } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Store name, username, and password are required' });
  }

  // Generate clean slug if not provided
  const storeSlug = (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  // Check unique slug & username
  const existingSlug = db.getStoreBySlug(storeSlug);
  if (existingSlug) {
    return res.status(400).json({ error: `Store slug '${storeSlug}' already exists. Choose another.` });
  }

  const existingUser = db.getStoreByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: `Username '${username}' is already taken.` });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const newStore = db.createStore({
    name,
    slug: storeSlug,
    username,
    password_hash,
    email: email || '',
    phone: phone || '',
    address: address || ''
  });

  res.status(201).json({
    message: 'Store created successfully',
    store: {
      id: newStore.id,
      name: newStore.name,
      slug: newStore.slug,
      username: newStore.username,
      email: newStore.email,
      phone: newStore.phone,
      address: newStore.address,
      currency: newStore.currency,
      created_at: newStore.created_at
    }
  });
});

// Update store
router.put('/stores/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, is_active, password } = req.body;

  const store = db.getStoreById(id);
  if (!store) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (is_active !== undefined) updates.is_active = Boolean(is_active);

  if (password && password.trim().length > 0) {
    const salt = bcrypt.genSaltSync(10);
    updates.password_hash = bcrypt.hashSync(password, salt);
  }

  const updated = db.updateStore(id, updates);
  res.json({ message: 'Store updated', store: updated });
});

// Delete store
router.delete('/stores/:id', (req, res) => {
  const { id } = req.params;
  const success = db.deleteStore(id);
  if (!success) {
    return res.status(404).json({ error: 'Store not found' });
  }
  res.json({ message: 'Store deleted successfully' });
});

// Manual 24h purge trigger
router.post('/purge-now', (req, res) => {
  runPurgeNow();
  res.json({ message: '24-hour cleanup cycle completed successfully.' });
});

module.exports = router;
