const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbState = {
  superadmins: [],
  stores: [],
  store_pricing: {},
  store_gsm_tiers: {},
  orders: []
};

// Save state to disk atomically
function persist() {
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Load state or initialize with seed data
function initDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(data);
      console.log('✅ Database loaded successfully from disk.');
      return;
    } catch (err) {
      console.error('Error reading database file, reinitializing default state:', err);
    }
  }

  console.log('⚡ Initializing fresh database with default seed data...');

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'PrintFlow#Secure2026!Adm', salt);
  const campusPasswordHash = bcrypt.hashSync('campus123', salt);
  const metroPasswordHash = bcrypt.hashSync('metro123', salt);

  // 1. Superadmin Seed
  dbState.superadmins = [
    {
      id: 'sa_1',
      username: 'admin',
      password_hash: adminPasswordHash,
      name: 'Platform Superadmin',
      created_at: new Date().toISOString()
    }
  ];

  // 2. Demo Stores
  dbState.stores = [
    {
      id: 'store_campus',
      name: 'Campus Print Hub',
      slug: 'campus-print',
      username: 'campus',
      password_hash: campusPasswordHash,
      email: 'campus@printhub.local',
      phone: '+91 98765 43210',
      address: 'North Gate Commercial Complex, University Campus',
      currency: 'INR',
      lat: 28.6139,
      lng: 77.2090,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'store_metro',
      name: 'Metro Digital Xerox',
      slug: 'metro-xerox',
      username: 'metro',
      password_hash: metroPasswordHash,
      email: 'metro@xerox.local',
      phone: '+91 98123 45678',
      address: 'Shop 14, Metro Station Concourse, Central Line',
      currency: 'INR',
      lat: 28.6185,
      lng: 77.2140,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  // 3. Store Pricing
  dbState.store_pricing = {
    store_campus: {
      bw_rate: 2.0,       // ₹2.00 per B/W page
      color_rate: 10.0,    // ₹10.00 per Color page
      duplex_discount: 0.5 // ₹0.50 discount on back side
    },
    store_metro: {
      bw_rate: 2.5,
      color_rate: 12.0,
      duplex_discount: 0.5
    }
  };

  // 4. Store GSM Tiers
  dbState.store_gsm_tiers = {
    store_campus: [
      { id: 'gsm_c1', name: '70 GSM Standard (Economy)', weight_gsm: 70, extra_cost: 0.0 },
      { id: 'gsm_c2', name: '75 GSM Executive Bond', weight_gsm: 75, extra_cost: 1.0 },
      { id: 'gsm_c3', name: '100 GSM Premium Heavy', weight_gsm: 100, extra_cost: 3.0 },
      { id: 'gsm_c4', name: '180 GSM Glossy Photo Card', weight_gsm: 180, extra_cost: 8.0 }
    ],
    store_metro: [
      { id: 'gsm_m1', name: '70 GSM Normal Copier', weight_gsm: 70, extra_cost: 0.0 },
      { id: 'gsm_m2', name: '80 GSM Premium Paper', weight_gsm: 80, extra_cost: 1.5 },
      { id: 'gsm_m3', name: '100 GSM Bond Paper', weight_gsm: 100, extra_cost: 3.5 },
      { id: 'gsm_m4', name: '200 GSM Photo Sheet', weight_gsm: 200, extra_cost: 10.0 }
    ]
  };

  dbState.orders = [];
  persist();
  console.log('✅ Database seeded with Superadmin and 2 demo stores.');
}

initDatabase();

module.exports = {
  // Superadmins
  findSuperadminByUsername: (username) => {
    return dbState.superadmins.find((sa) => sa.username === username);
  },
  getSuperadminById: (id) => {
    return dbState.superadmins.find((sa) => sa.id === id);
  },

  // Stores
  getAllStores: () => {
    return dbState.stores;
  },
  getStoreById: (id) => {
    return dbState.stores.find((s) => s.id === id);
  },
  getStoreBySlug: (slug) => {
    return dbState.stores.find((s) => s.slug === slug);
  },
  getStoreByUsername: (username) => {
    return dbState.stores.find((s) => s.username === username);
  },
  createStore: (storeData) => {
    const newStore = {
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      currency: 'INR',
      is_active: true,
      created_at: new Date().toISOString(),
      ...storeData
    };
    dbState.stores.push(newStore);

    // Initialize default pricing
    dbState.store_pricing[newStore.id] = {
      bw_rate: 2.0,
      color_rate: 10.0,
      duplex_discount: 0.5
    };

    // Initialize default GSM tiers
    dbState.store_gsm_tiers[newStore.id] = [
      { id: `gsm_${Date.now()}_1`, name: '70 GSM Standard', weight_gsm: 70, extra_cost: 0.0 },
      { id: `gsm_${Date.now()}_2`, name: '75 GSM Bond', weight_gsm: 75, extra_cost: 1.0 },
      { id: `gsm_${Date.now()}_3`, name: '100 GSM Heavyweight', weight_gsm: 100, extra_cost: 3.0 }
    ];

    persist();
    return newStore;
  },
  updateStore: (id, updates) => {
    const index = dbState.stores.findIndex((s) => s.id === id);
    if (index === -1) return null;
    dbState.stores[index] = { ...dbState.stores[index], ...updates };
    persist();
    return dbState.stores[index];
  },
  deleteStore: (id) => {
    const index = dbState.stores.findIndex((s) => s.id === id);
    if (index === -1) return false;
    dbState.stores.splice(index, 1);
    delete dbState.store_pricing[id];
    delete dbState.store_gsm_tiers[id];
    // Keep orders or cleanup as needed
    persist();
    return true;
  },

  // Pricing & GSM
  getStorePricing: (storeId) => {
    return dbState.store_pricing[storeId] || { bw_rate: 2.0, color_rate: 10.0, duplex_discount: 0.5 };
  },
  updateStorePricing: (storeId, pricing) => {
    dbState.store_pricing[storeId] = {
      ...dbState.store_pricing[storeId],
      ...pricing
    };
    persist();
    return dbState.store_pricing[storeId];
  },
  getStoreGsmTiers: (storeId) => {
    return dbState.store_gsm_tiers[storeId] || [];
  },
  setStoreGsmTiers: (storeId, tiers) => {
    dbState.store_gsm_tiers[storeId] = tiers;
    persist();
    return dbState.store_gsm_tiers[storeId];
  },

  // Orders
  createOrder: (orderData) => {
    const storeOrders = dbState.orders.filter((o) => o.store_id === orderData.store_id);
    const tokenIndex = storeOrders.length + 1;
    // Format token e.g. #TK-101
    const tokenNumber = `TK-${100 + (tokenIndex % 900)}`;

    const newOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      token_number: tokenNumber,
      status: 'PENDING', // PENDING -> PRINTING -> READY -> COMPLETED
      created_at: new Date().toISOString(),
      printed_at: null,
      completed_at: null,
      file_deleted: false,
      ...orderData
    };

    dbState.orders.unshift(newOrder); // newest first
    persist();
    return newOrder;
  },
  getOrdersByStoreId: (storeId) => {
    return dbState.orders.filter((o) => o.store_id === storeId);
  },
  getOrderById: (orderId) => {
    return dbState.orders.find((o) => o.id === orderId);
  },
  updateOrderStatus: (orderId, status) => {
    const order = dbState.orders.find((o) => o.id === orderId);
    if (!order) return null;
    order.status = status;
    if (status === 'PRINTING' && !order.printed_at) {
      order.printed_at = new Date().toISOString();
    }
    if (status === 'COMPLETED' && !order.completed_at) {
      order.completed_at = new Date().toISOString();
    }
    persist();
    return order;
  },
  markOrderFileDeleted: (orderId) => {
    const order = dbState.orders.find((o) => o.id === orderId);
    if (order) {
      order.file_deleted = true;
      persist();
    }
  },
  getAllOrders: () => {
    return dbState.orders;
  }
};
