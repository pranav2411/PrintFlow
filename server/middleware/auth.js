const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'print_file_system_super_secret_jwt_key_2026';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireSuperadmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    return res.status(403).json({ error: 'Superadmin privileges required' });
  });
}

function requireShopkeeper(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'shopkeeper') {
      req.storeId = req.user.storeId;
      return next();
    }
    return res.status(403).json({ error: 'Shopkeeper privileges required' });
  });
}

module.exports = {
  generateToken,
  authenticateToken,
  requireSuperadmin,
  requireShopkeeper
};
