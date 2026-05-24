const router = require('express').Router();
const { addEvidence, getByNegoId } = require('../controllers/evidenceController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

router.use(authenticate);

// POST /evidence — Mitra tambah bukti
router.post(
  '/',
  authorize('Mitra'),
  requireFields(['nego_id']),
  addEvidence
);

// GET /evidence/:nego_id — Lihat bukti
router.get('/:nego_id', getByNegoId);

module.exports = router;
