const router = require('express').Router();
const { getNotifications, markAsRead, submitHelp } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// GET /notifications (protected)
router.get('/', authenticate, getNotifications);

// PATCH /notifications/:id/read (protected)
router.patch('/:id/read', authenticate, markAsRead);

// POST /notifications/help (protected)
router.post('/help', authenticate, submitHelp);

module.exports = router;
