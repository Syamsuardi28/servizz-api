const router = require('express').Router();
const { getAll, getById, verify, getRating } = require('../controllers/technicianController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

// GET /technicians — Publik (atau Admin)
router.get('/', getAll);

// GET /technicians/:id — Publik
router.get('/:id', getById);

// PATCH /technicians/:id/verify — Hanya Admin
router.patch(
  '/:id/verify',
  authenticate,
  authorize('Admin'),
  requireFields(['status']),
  verify
);

// GET /rating/technician/:id — Publik (untuk rating/review)
router.get('/rating/:id', getRating);

module.exports = router;
