const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// ✅ Old OTP login (backward compatible)
router.post('/send-otp', otpLimiter, authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// ✅ New Registration flow
router.post('/register/send-otp', otpLimiter, authController.registerSendOTP);
router.post('/register/verify-otp', authController.registerVerifyOTP);

// ✅ Password login
router.post('/login', authController.loginWithPassword);

// ✅ Forgot + Reset Password
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ✅ Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.post('/onboarding', protect, authController.submitOnboarding);
router.post('/whatsapp/connect', protect, authController.connectWhatsApp);

module.exports = router;