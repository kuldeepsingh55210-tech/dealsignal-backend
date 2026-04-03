const express = require('express');
const { verifyWebhook, handleIncomingMessage, getMessagesByLead, sendManualMessage } = require('../controllers/webhook.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Public Webhook Routes (Meta Graph API)
router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', handleIncomingMessage);

// Protected Dashboard Routes
router.use(protect);
router.get('/messages/:leadId', getMessagesByLead);
router.post('/whatsapp/send', sendManualMessage);

module.exports = router;
