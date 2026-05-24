const router = require('express').Router();
const { getAll, create } = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

// GET /services — Publik
router.get('/', getAll);

// POST /services — Hanya Admin
router.post(
  '/',
  authenticate,
  authorize('Admin'),
  requireFields(['nama_service']),
  create
);

module.exports = router;
