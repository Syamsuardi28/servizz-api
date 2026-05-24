const router = require('express').Router();
const { charge, callback } = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

// POST /payment/charge — Pelanggan memulai pembayaran
router.post(
  '/charge',
  authenticate,
  authorize('Pelanggan'),
  requireFields(['order_id', 'payment_type']),
  charge
);

// POST /payment/callback — Webhook dari Midtrans (tidak perlu JWT)
router.post('/callback', callback);

module.exports = router;
