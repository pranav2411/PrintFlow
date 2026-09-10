const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for rich multi-page documents
  }
});

module.exports = {
  upload,
  UPLOADS_DIR
};
