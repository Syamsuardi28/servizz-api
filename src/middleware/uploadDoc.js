const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Gunakan /tmp jika berjalan di Vercel, jika tidak gunakan public/uploads
const baseUploadDir = process.env.VERCEL === '1' || process.env.VERCEL_REGION ? '/tmp/uploads' : path.join(__dirname, '../../public/uploads');
const uploadDir = path.join(baseUploadDir, 'documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // allow images and pdfs
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPEG, JPG, PNG, WEBP) dan PDF yang diperbolehkan.'));
  }
};

const uploadDoc = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

module.exports = uploadDoc;
