/**
 * Secure File Upload Utility
 * Handles complaint attachment uploads with MIME validation, magic byte checking,
 * filename randomization, path traversal protection, and storage quotas.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Resolve persistent uploads directory
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

// Allowed MIME types and extensions
const MIME_EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Check magic bytes / file signatures
const verifyMagicBytes = (filePath, mimeType) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      // JPEG starts with FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimeType === 'image/png') {
      // PNG starts with 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    if (mimeType === 'image/webp') {
      // WebP starts with RIFF (bytes 0-3) and WEBP at bytes 8-11
      const isRiff = buffer.toString('utf8', 0, 4) === 'RIFF';
      const isWebp = buffer.toString('utf8', 8, 12) === 'WEBP';
      return isRiff && isWebp;
    }

    return false;
  } catch (err) {
    console.error('[verifyMagicBytes] Error reading file header:', err.message);
    return false;
  }
};

// Disk Storage with sanitized random filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    const ext = MIME_EXT_MAP[file.mimetype.toLowerCase()] || path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `complaint-${uniqueSuffix}${ext}`);
  },
});

// File filter for MIME type validation
const fileFilter = (req, file, cb) => {
  const normalizedMime = file.mimetype.toLowerCase();
  if (MIME_EXT_MAP[normalizedMime]) {
    cb(null, true);
  } else {
    const error = new Error('Unsupported file type. Only JPEG, PNG, and WebP images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

/**
 * Middleware wrapper that supports both JSON and multipart/form-data
 * while validating magic bytes and catching errors cleanly.
 */
const complaintUploadMiddleware = (req, res, next) => {
  upload.array('images', MAX_FILES)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum file size allowed is 5 MB per image.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum of 5 images allowed per complaint.',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE' || err.message) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file uploaded.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error processing uploaded files',
        error: err.message,
      });
    }

    // Verify magic bytes for any uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isValid = verifyMagicBytes(file.path, file.mimetype);
        if (!isValid) {
          // Clean up all uploaded files
          try {
            for (const f of req.files) {
              if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            }
          } catch (cleanupErr) {
            console.error('[Upload Cleanup Error]', cleanupErr.message);
          }
          return res.status(400).json({
            success: false,
            message: `File "${file.originalname}" content does not match its claimed image type.`,
          });
        }
      }
    }

    next();
  });
};

module.exports = {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  MAX_FILES,
  verifyMagicBytes,
  complaintUploadMiddleware,
};
