const fs = require('fs');
const cron = require('node-cron');
const db = require('../config/database');

const PURGE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function runPurgeNow() {
  const allOrders = db.getAllOrders();
  const now = Date.now();
  let deletedCount = 0;

  for (const order of allOrders) {
    if (order.file_deleted) continue;

    // Check completion time or creation time
    const referenceTime = order.completed_at
      ? new Date(order.completed_at).getTime()
      : order.printed_at
      ? new Date(order.printed_at).getTime()
      : new Date(order.created_at).getTime();

    if (now - referenceTime >= PURGE_AFTER_MS) {
      if (order.file_path && fs.existsSync(order.file_path)) {
        try {
          fs.unlinkSync(order.file_path);
          console.log(`🗑️ [Auto-Purge 24h] Deleted expired file for Order ${order.token_number} (${order.file_path})`);
        } catch (err) {
          console.error(`Failed to delete expired file ${order.file_path}:`, err.message);
        }
      }
      db.markOrderFileDeleted(order.id);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`⏰ [Auto-Purge] Cleaned up ${deletedCount} document file(s) older than 24 hours.`);
  }
}

// Schedule hourly check
function startCleanupScheduler() {
  console.log('⏰ Auto-Purge Scheduler initialized (runs hourly to delete files 24 hours after completion).');
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    runPurgeNow();
  });

  // Also run a quick sweep on startup
  setTimeout(() => {
    runPurgeNow();
  }, 5000);
}

module.exports = {
  startCleanupScheduler,
  runPurgeNow
};
