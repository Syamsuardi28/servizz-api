const router = require('express').Router();
const { createNegotiation, updatePrice, approveNegotiation, getByOrderId } = require('../controllers/negoController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

router.use(authenticate);

// POST /nego/create — Mitra membuat negosiasi baru
router.post(
  '/create',
  authorize('Mitra'),
  requireFields(['order_id', 'deskripsi_kerusakan', 'harga_barang', 'biaya_jasa']),
  createNegotiation
);

// PATCH /nego/update-price — Mitra update harga (Digital Lock reset)
router.patch(
  '/update-price',
  authorize('Mitra'),
  requireFields(['order_id', 'item_price', 'service_fee']),
  updatePrice
);

// POST /nego/approve — Pelanggan setuju / tolak harga
router.post(
  '/approve',
  authorize('Pelanggan'),
  requireFields(['nego_id', 'is_approved']),
  approveNegotiation
);

// GET /nego/:order_id — Detail negosiasi + evidence
router.get('/:order_id', getByOrderId);

module.exports = router;
