const express = require('express');
const { connectWhatsApp, getStatus } = require('../controllers/whatsapp.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/connect', protect, connectWhatsApp);
router.get('/status', protect, getStatus);

module.exports = router;
