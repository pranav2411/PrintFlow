const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const storeRoutes = require('./routes/stores');
const orderRoutes = require('./routes/orders');
const { startCleanupScheduler } = require('./services/cleanupService');

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time duplex synchronization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static uploads serving for previews
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Network IP helper to make QR Standee work effortlessly on store Wi-Fi
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/system-info', (req, res) => {
  const forwardedProto = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'http');
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const publicOrigin = process.env.PUBLIC_URL || `${forwardedProto}://${forwardedHost}`;

  res.json({
    publicOrigin,
    localIp: getLocalNetworkIp(),
    port: process.env.PORT || 5050,
    clientPort: 5173,
    currency: 'INR'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/orders', orderRoutes);

// Socket.io Rooms
io.on('connection', (socket) => {
  // Shopkeeper joins their isolated store room
  socket.on('join_store', (storeId) => {
    if (storeId) {
      socket.join(`store_${storeId}`);
      console.log(`📡 Socket ${socket.id} joined room store_${storeId}`);
    }
  });

  // Customer phone joins their specific order room for live tracking
  socket.on('join_order', (orderId) => {
    if (orderId) {
      socket.join(`order_${orderId}`);
      console.log(`📱 Customer socket ${socket.id} listening to order_${orderId}`);
    }
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Static production build serving (Unified Single-Service Deployment)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Start 24-hour Auto-Purge Worker
startCleanupScheduler();

const PORT = process.env.PORT || 5050;
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log('\n======================================================');
  console.log('🚀 PrintFlow Production Server Running');
  console.log(`📡 Local Port:      http://localhost:${PORT}`);
  console.log(`🌐 Network URL:     http://${localIp}:${PORT}`);
  console.log(`👑 Superadmin Portal: /admin`);
  console.log(`🏪 Store POS Portal:  /store`);
  console.log('======================================================\n');
});
