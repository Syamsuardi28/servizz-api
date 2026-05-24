const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// Get all messages for the current user
router.get('/', authenticate, messageController.getMessages);

// Send a new message
router.post('/', authenticate, messageController.sendMessage);

module.exports = router;
