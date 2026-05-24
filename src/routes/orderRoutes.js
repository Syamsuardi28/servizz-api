const router = require('express').Router();
const { createOrder, getOrders, getOrderById, assignTechnician, updateStatus } = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

// Semua route membutuhkan autentikasi
router.use(authenticate);

// POST /order/create — Hanya Pelanggan
router.post(
  '/create',
  authorize('Pelanggan'),
  requireFields(['service_id', 'lat', 'long', 'tgl_kunjungan']),
  createOrder
);

// GET /order — Semua role (filtered per role di controller)
router.get('/', getOrders);

// GET /order/:id — Semua role (diotorisasi di controller)
router.get('/:id', getOrderById);

// PATCH /order/:id/assign — Hanya Admin
router.patch(
  '/:id/assign',
  authorize('Admin'),
  requireFields(['id_tech']),
  assignTechnician
);

// PATCH /order/:id/status
router.patch(
  '/:id/status',
  authorize('Admin', 'Mitra'),
  requireFields(['status']),
  updateStatus
);

const { submitRating } = require('../controllers/orderController');
// POST /order/:id/rating — Hanya Pelanggan
router.post(
  '/:id/rating',
  authorize('Pelanggan'),
  requireFields(['nilai']),
  submitRating
);

module.exports = router;
