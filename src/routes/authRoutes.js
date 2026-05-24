const router = require('express').Router();
const { register, login, getMe, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

// POST /auth/register
router.post(
  '/register',
  requireFields(['nama', 'email', 'password', 'no_hp', 'alamat']),
  register
);

// POST /auth/login
router.post(
  '/login',
  requireFields(['email', 'password']),
  login
);

// GET /auth/me  (protected)
router.get('/me', authenticate, getMe);

// PATCH /auth/me (protected)
router.patch('/me', authenticate, updateMe);

// POST /auth/avatar (protected)
const upload = require('../middleware/upload');
const uploadDoc = require('../middleware/uploadDoc');
const { uploadAvatar, deleteAvatar, updatePassword, uploadDocuments } = require('../controllers/authController');
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);

// POST /auth/documents (protected, untuk Mitra)
router.post('/documents', authenticate, uploadDoc.fields([{ name: 'foto_skck', maxCount: 1 }, { name: 'sertifikat', maxCount: 1 }]), uploadDocuments);

// PATCH /auth/password (protected)
router.patch('/password', authenticate, updatePassword);

module.exports = router;
