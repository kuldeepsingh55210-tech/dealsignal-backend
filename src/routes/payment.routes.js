const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getPlans } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// ✅ Public route — plans dekho
router.get('/plans', getPlans);

// ✅ Protected routes — payment
router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;