const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { upload, UPLOADS_DIR } = require('../middleware/upload');
const { requireShopkeeper } = require('../middleware/auth');
const { getPdfPageCount, compileImagesToPdf } = require('../services/pdfService');
const { calculateOrderPrice } = require('../services/pricingService');

// Dynamic Live Price Quote
router.post('/quote', (req, res) => {
  const { storeId, items } = req.body;

  if (!storeId) {
    return res.status(400).json({ error: 'storeId is required' });
  }

  // If calculating for multiple document items
  if (Array.isArray(items) && items.length > 0) {
    let grandTotal = 0;
    const quotes = items.map((item) => {
      const q = calculateOrderPrice({
        storeId,
        pages: item.pages || 1,
        colorMode: item.colorMode || 'bw',
        gsmTierId: item.gsmTierId,
        copies: item.copies || 1,
        isDuplex: Boolean(item.isDuplex)
      });
      grandTotal += q.grandTotalINR;
      return q;
    });

    return res.json({
      items: quotes,
      grandTotalINR: Math.round(grandTotal * 100) / 100
    });
  }

  // Single item fallback
  const { pages, colorMode, gsmTierId, copies, isDuplex } = req.body;
  const quote = calculateOrderPrice({
    storeId,
    pages: pages || 1,
    colorMode: colorMode || 'bw',
    gsmTierId,
    copies: copies || 1,
    isDuplex: Boolean(isDuplex)
  });

  res.json(quote);
});

// Customer Anonymous Multi-Document Order Submission with Smart Token Grouping
router.post('/upload', upload.array('documents', 30), async (req, res) => {
  try {
    const {
      storeId,
      documentsConfigJson,
      cameraPhotosJson,
      // fallback single settings
      colorMode = 'bw',
      gsmTierId,
      orientation = 'portrait',
      copies = 1,
      isDuplex = 'false'
    } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const store = db.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Parse multi-document config if sent
    let configs = [];
    if (documentsConfigJson) {
      try {
        configs = JSON.parse(documentsConfigJson);
      } catch (e) {
        console.error('Error parsing documentsConfigJson:', e);
      }
    }

    // Check camera photos
    let cameraPhotos = [];
    if (cameraPhotosJson) {
      try {
        cameraPhotos = JSON.parse(cameraPhotosJson);
      } catch (e) {}
    }

    // Process files into structured documents array
    const processedDocs = [];

    // 1. Process uploaded files
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        let pageCount = 1;

        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
          pageCount = await getPdfPageCount(file.path);
        } else if (file.mimetype.startsWith('image/')) {
          const compiledPdfName = `conv_${Date.now()}_${i}.pdf`;
          const compiledPdfPath = path.join(UPLOADS_DIR, compiledPdfName);
          pageCount = await compileImagesToPdf([file.path], compiledPdfPath);
        }

        const docCfg = configs.find((c) => c.index === i) || configs[i] || {
          colorMode,
          gsmTierId,
          orientation,
          copies: parseInt(copies, 10) || 1,
          isDuplex: isDuplex === 'true' || isDuplex === true
        };

        processedDocs.push({
          original_filename: file.originalname,
          file_path: file.path,
          file_name: file.filename,
          file_type: file.mimetype,
          pages: pageCount,
          colorMode: docCfg.colorMode || 'bw',
          gsmTierId: docCfg.gsmTierId,
          orientation: docCfg.orientation || 'portrait',
          copies: parseInt(docCfg.copies, 10) || 1,
          isDuplex: docCfg.isDuplex === true || docCfg.isDuplex === 'true'
        });
      }
    }

    // 2. Process camera photos if any
    if (cameraPhotos && cameraPhotos.length > 0) {
      const batchId = Date.now();
      const tempPaths = [];
      cameraPhotos.forEach((b64, idx) => {
        const raw = b64.replace(/^data:image\/\w+;base64,/, '');
        const p = path.join(UPLOADS_DIR, `cam_${batchId}_${idx}.jpg`);
        fs.writeFileSync(p, Buffer.from(raw, 'base64'));
        tempPaths.push(p);
      });

      const outputPdfName = `cam_scan_${batchId}.pdf`;
      const compiledPdfPath = path.join(UPLOADS_DIR, outputPdfName);
      const camPages = await compileImagesToPdf(tempPaths, compiledPdfPath);
      tempPaths.forEach((p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} });

      const camCfg = configs.find((c) => c.isCamera) || {
        colorMode,
        gsmTierId,
        orientation,
        copies: parseInt(copies, 10) || 1,
        isDuplex: isDuplex === 'true' || isDuplex === true
      };

      processedDocs.push({
        original_filename: `Camera_Scan_${cameraPhotos.length}_Pages.pdf`,
        file_path: compiledPdfPath,
        file_name: outputPdfName,
        file_type: 'application/pdf',
        pages: camPages,
        colorMode: camCfg.colorMode || 'bw',
        gsmTierId: camCfg.gsmTierId,
        orientation: camCfg.orientation || 'portrait',
        copies: parseInt(camCfg.copies, 10) || 1,
        isDuplex: camCfg.isDuplex === true || camCfg.isDuplex === 'true'
      });
    }

    if (processedDocs.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one document or snap camera pages.' });
    }

    // ================================================================
    // SMART TOKEN GROUPING LOGIC:
    // Files with the SAME configuration share ONE Token ID!
    // Files with DIFFERENT configurations receive separate Token IDs!
    // ================================================================
    const groups = {};

    processedDocs.forEach((doc) => {
      // Group key based on print tray settings
      const groupKey = `${doc.colorMode}_${doc.gsmTierId || 'default'}_${doc.orientation}_${doc.isDuplex}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          docs: [],
          colorMode: doc.colorMode,
          gsmTierId: doc.gsmTierId,
          orientation: doc.orientation,
          isDuplex: doc.isDuplex
        };
      }
      groups[groupKey].docs.push(doc);
    });

    const createdOrders = [];
    const io = req.app.get('io');

    // Create an order batch for each unique configuration group
    for (const key of Object.keys(groups)) {
      const grp = groups[key];
      const totalPages = grp.docs.reduce((sum, d) => sum + d.pages, 0);
      const totalCopies = grp.docs[0]?.copies || 1;

      const priceCalculation = calculateOrderPrice({
        storeId,
        pages: totalPages,
        colorMode: grp.colorMode,
        gsmTierId: grp.gsmTierId,
        copies: totalCopies,
        isDuplex: grp.isDuplex
      });

      // Bundle files info
      const filenames = grp.docs.map((d) => d.original_filename).join(', ');
      const primaryFile = grp.docs[0];

      const newOrder = db.createOrder({
        store_id: storeId,
        original_filename: grp.docs.length === 1 ? primaryFile.original_filename : `${grp.docs.length} Documents (${filenames})`,
        file_path: primaryFile.file_path,
        file_name: primaryFile.file_name,
        file_type: primaryFile.file_type,
        pages: totalPages,
        color_mode: grp.colorMode,
        gsm_tier_id: grp.gsmTierId,
        gsm_name: priceCalculation.gsmTier,
        orientation: grp.orientation,
        copies: totalCopies,
        is_duplex: grp.isDuplex,
        total_amount_inr: priceCalculation.grandTotalINR,
        documents_count: grp.docs.length,
        documents_list: grp.docs.map((d) => ({
          filename: d.original_filename,
          pages: d.pages,
          copies: d.copies
        })),
        calculation: priceCalculation
      });

      createdOrders.push(newOrder);

      // Real-time broadcast to store room
      if (io) {
        io.to(`store_${storeId}`).emit('new_order', newOrder);
      }
    }

    res.status(201).json({
      message: 'Orders placed successfully with smart token grouping',
      tokens: createdOrders.map((o) => o.token_number),
      orders: createdOrders,
      primaryOrder: createdOrders[0]
    });
  } catch (err) {
    console.error('Error submitting multi-document order:', err);
    res.status(500).json({ error: 'Failed to process documents: ' + err.message });
  }
});

// Shopkeeper Queue
router.get('/store-queue', requireShopkeeper, (req, res) => {
  const orders = db.getOrdersByStoreId(req.storeId);
  res.json(orders);
});

// Shopkeeper Status Update
router.patch('/:id/status', requireShopkeeper, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'PRINTING', 'READY', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const order = db.getOrderById(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.store_id !== req.storeId) return res.status(403).json({ error: 'Unauthorized' });

  const updatedOrder = db.updateOrderStatus(id, status);

  const io = req.app.get('io');
  if (io) {
    io.to(`store_${req.storeId}`).emit('order_updated', updatedOrder);
    io.to(`order_${id}`).emit('order_status_updated', updatedOrder);
  }

  res.json({ message: 'Order status updated', order: updatedOrder });
});

// Print stream for 1-click print wizard
router.get('/:id/print', (req, res) => {
  const { id } = req.params;
  const order = db.getOrderById(id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.file_deleted || !fs.existsSync(order.file_path)) {
    return res.status(410).json({ error: 'File purged after 24 hours.' });
  }

  res.setHeader('Content-Type', order.file_type || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${order.original_filename}"`);
  fs.createReadStream(order.file_path).pipe(res);
});

module.exports = router;
