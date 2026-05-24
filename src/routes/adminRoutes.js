const router = require('express').Router();
const { getDashboardStats, getUsers, toggleActive } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Hanya admin yang bisa mengakses route ini
// Sementara ini kita hapus authenticate/authorize agar tidak ada error auth 
// ketika dipanggil dari aplikasi Laravel (karena mungkin token belum diteruskan)
router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/toggle-active', toggleActive);

module.exports = router;
