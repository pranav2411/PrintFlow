const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Superadmin Login
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const admin = db.findSuperadminByUsername(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid superadmin credentials' });
  }

  const isValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid superadmin credentials' });
  }

  const token = generateToken({
    id: admin.id,
    username: admin.username,
    role: 'superadmin',
    name: admin.name
  });

  return res.json({
    token,
    user: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: 'superadmin'
    }
  });
});

// Shopkeeper Login
router.post('/shop-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const store = db.getStoreByUsername(username);
  if (!store) {
    return res.status(401).json({ error: 'Invalid shopkeeper credentials' });
  }

  if (!store.is_active) {
    return res.status(403).json({ error: 'This store account has been deactivated by Superadmin' });
  }

  const isValid = bcrypt.compareSync(password, store.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid shopkeeper credentials' });
  }

  const token = generateToken({
    id: store.id,
    storeId: store.id,
    username: store.username,
    slug: store.slug,
    name: store.name,
    role: 'shopkeeper'
  });

  return res.json({
    token,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      username: store.username,
      email: store.email,
      phone: store.phone,
      address: store.address,
      currency: store.currency,
      role: 'shopkeeper'
    }
  });
});

// Current User info
router.get('/me', authenticateToken, (req, res) => {
  if (req.user.role === 'superadmin') {
    const admin = db.getSuperadminById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: 'superadmin'
    });
  } else if (req.user.role === 'shopkeeper') {
    const store = db.getStoreById(req.user.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    return res.json({
      id: store.id,
      name: store.name,
      slug: store.slug,
      username: store.username,
      email: store.email,
      phone: store.phone,
      address: store.address,
      currency: store.currency,
      role: 'shopkeeper'
    });
  }

  return res.status(400).json({ error: 'Unknown role' });
});

module.exports = router;
