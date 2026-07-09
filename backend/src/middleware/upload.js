/**
 * Multer configuration for file uploads.
 * Storage strategy and validation rules will be finalized in the next
 * milestone once upload requirements (file types, size limits) are defined.
 */

const multer = require('multer');
const path = require('path');

const config = require('../config');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', config.uploads.dir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxSizeMb * 1024 * 1024,
  },
});

module.exports = upload;
