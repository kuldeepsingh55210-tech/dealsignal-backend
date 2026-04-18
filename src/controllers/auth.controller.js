const Broker = require('../models/Broker');
const otpService = require('../services/otp.service');
const jwtService = require('../services/jwt.service');
const { successResponse, errorResponse } = require('../utils/response');
const axios = require('axios');
const crypto = require('crypto');

// ✅ Step 1 — Register: Details + Send OTP
const registerSendOTP = async (req, res, next) => {
    try {
        const { name, gender, city, mobile, email, password } = req.body;

        if (!name || !gender || !city || !mobile || !email || !password) {
            return errorResponse(res, "Sab fields bharna zaroori hai", 400);
        }
        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            return errorResponse(res, "Invalid mobile number", 400);
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return errorResponse(res, "Invalid email", 400);
        }
        if (password.length < 6) {
            return errorResponse(res, "Password kam se kam 6 characters ka hona chahiye", 400);
        }

        // Check existing
        const existingEmail = await Broker.findOne({ email });
        if (existingEmail) {
            return errorResponse(res, "Email already registered hai", 400);
        }
        const existingMobile = await Broker.findOne({ mobile });
        if (existingMobile) {
            return errorResponse(res, "Mobile number already registered hai", 400);
        }

        // OTP bhejo
        const otp = otpService.generateOTP();
        await otpService.saveOTP(mobile, otp);
        const sent = await otpService.sendOTP(mobile, otp, email);

        if (!sent.success) {
            return errorResponse(res, "OTP send karne mein problem aayi", 500);
        }

        return successResponse(res, null, "OTP sent successfully");
    } catch (error) {
        next(error);
    }
};

// ✅ Step 2 — Register: Verify OTP + Create Account
const registerVerifyOTP = async (req, res, next) => {
    try {
        const { name, gender, city, mobile, email, password, code } = req.body;

        const isValid = await otpService.verifyOTP(mobile, code);
        if (!isValid) {
            return errorResponse(res, "Invalid or expired OTP", 400);
        }

        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 14);

        const broker = new Broker({
            name,
            gender,
            city,
            mobile,
            email,
            password,
            subscription: {
                plan: 'trial',
                expiresAt: trialExpiry
            }
        });
        await broker.save();

        const token = jwtService.generateToken({
            brokerId: broker._id,
            tenantId: broker.tenantId,
            role: broker.role
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const brokerData = broker.toObject();
        delete brokerData.password;
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "Account created successfully!");
    } catch (error) {
        next(error);
    }
};

// ✅ Login with Password
const loginWithPassword = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, "Email aur password dono chahiye", 400);
        }

        const broker = await Broker.findOne({ email });
        if (!broker || !broker.isActive) {
            return errorResponse(res, "Account nahi mila", 401);
        }

        if (!broker.password) {
            return errorResponse(res, "Is account mein password set nahi hai. OTP se login karo.", 400);
        }

        const isMatch = await broker.comparePassword(password);
        if (!isMatch) {
            return errorResponse(res, "Password galat hai", 401);
        }

        broker.lastActive = Date.now();
        await broker.save();

        const token = jwtService.generateToken({
            brokerId: broker._id,
            tenantId: broker.tenantId,
            role: broker.role
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const brokerData = broker.toObject();
        delete brokerData.password;
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "Logged in successfully");
    } catch (error) {
        next(error);
    }
};

// ✅ Forgot Password — Send Reset Email
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const broker = await Broker.findOne({ email });
        if (!broker) {
            return errorResponse(res, "Email registered nahi hai", 404);
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        broker.resetPasswordToken = resetToken;
        broker.resetPasswordExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min
        await broker.save();

        const resetUrl = `https://app.narrowtech.in/reset-password?token=${resetToken}`;

        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'DealSignal <noreply@narrowtech.in>',
            to: email,
            subject: 'Password Reset — DealSignal',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #25D366;">DealSignal Password Reset</h2>
                    <p>Aapne password reset request ki hai.</p>
                    <a href="${resetUrl}" style="background: #25D366; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0;">
                        Reset Password
                    </a>
                    <p style="color: #666;">Yeh link 30 minutes mein expire ho jaayega.</p>
                    <p style="color: #666;">Agar aapne request nahi ki toh ignore karein.</p>
                </div>
            `
        });

        return successResponse(res, null, "Password reset link email pe bhej diya gaya hai");
    } catch (error) {
        next(error);
    }
};

// ✅ Reset Password
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return errorResponse(res, "Token aur password chahiye", 400);
        }
        if (password.length < 6) {
            return errorResponse(res, "Password kam se kam 6 characters ka hona chahiye", 400);
        }

        const broker = await Broker.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date() }
        });

        if (!broker) {
            return errorResponse(res, "Token invalid ya expire ho gaya hai", 400);
        }

        broker.password = password;
        broker.resetPasswordToken = null;
        broker.resetPasswordExpiry = null;
        await broker.save();

        return successResponse(res, null, "Password successfully reset ho gaya!");
    } catch (error) {
        next(error);
    }
};

const sendOTP = async (req, res, next) => {
    try {
        const { mobile, email, name } = req.body;

        if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile) || !email || !/^\S+@\S+\.\S+$/.test(email)) {
            return errorResponse(res, "Invalid mobile or email", 400);
        }

        let broker = await Broker.findOne({ mobile });
        if (!broker) {
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 14);

            broker = new Broker({
                name: name || 'Broker',
                email,
                mobile,
                subscription: {
                    plan: 'trial',
                    expiresAt: trialExpiry
                }
            });
            await broker.save();
        }

        const otp = otpService.generateOTP();
        await otpService.saveOTP(mobile, otp);
        const sent = await otpService.sendOTP(mobile, otp, email);

        if (!sent.success) {
            console.log('OTP send failed');
        }

        return successResponse(res, null, "OTP sent successfully");
    } catch (error) {
        next(error);
    }
};

const verifyOTP = async (req, res, next) => {
    try {
        const { mobile, code } = req.body;

        const isValid = await otpService.verifyOTP(mobile, code);
        if (!isValid) {
            return errorResponse(res, "Invalid or expired OTP", 400);
        }

        const broker = await Broker.findOne({ mobile });
        if (!broker || !broker.isActive) {
            return errorResponse(res, "Account not found or deactivated", 401);
        }

        broker.lastActive = Date.now();
        await broker.save();

        const token = jwtService.generateToken({
            brokerId: broker._id,
            tenantId: broker.tenantId,
            role: broker.role
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const brokerData = broker.toObject();
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "Logged in successfully");
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        return successResponse(res, null, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        return successResponse(res, req.broker);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return errorResponse(res, "Valid name is required", 400);
        }

        const broker = await Broker.findById(req.broker._id);
        if (!broker) {
            return errorResponse(res, "Broker not found", 404);
        }

        broker.name = name.trim();
        await broker.save();

        const brokerData = broker.toObject();
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "Profile updated successfully");
    } catch (error) {
        next(error);
    }
};

const submitOnboarding = async (req, res, next) => {
    try {
        const {
            city, experience, propertyType,
            dealType, monthlyLeads, leadSource, painPoint
        } = req.body;

        const broker = await Broker.findById(req.broker._id);
        if (!broker) {
            return errorResponse(res, "Broker not found", 404);
        }

        broker.onboarding = {
            completed: true,
            city, experience, propertyType,
            dealType, monthlyLeads, leadSource, painPoint
        };

        await broker.save();

        const brokerData = broker.toObject();
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "Onboarding completed!");
    } catch (error) {
        next(error);
    }
};

const connectWhatsApp = async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return errorResponse(res, "Authorization code missing", 400);
        }

        const tokenResponse = await axios.get(
            `https://graph.facebook.com/v19.0/oauth/access_token`,
            {
                params: {
                    client_id: process.env.META_APP_ID,
                    client_secret: process.env.META_APP_SECRET,
                    code: code,
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        const waResponse = await axios.get(
            `https://graph.facebook.com/v19.0/me/businesses`,
            { params: { access_token: accessToken } }
        );

        const waAccountId = waResponse.data.data?.[0]?.id;

        const phoneResponse = await axios.get(
            `https://graph.facebook.com/v19.0/${waAccountId}/phone_numbers`,
            { params: { access_token: accessToken } }
        );

        const phoneNumberId = phoneResponse.data.data?.[0]?.id;
        const verifiedPhone = phoneResponse.data.data?.[0]?.display_phone_number;

        const broker = await Broker.findById(req.broker._id);
        broker.wa_access_token = accessToken;
        broker.wa_business_account_id = waAccountId;
        broker.wa_phone_number_id = phoneNumberId;
        broker.wa_verified_phone = verifiedPhone;
        broker.wa_connected = true;
        await broker.save();

        const brokerData = broker.toObject();
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, "WhatsApp connected successfully!");
    } catch (error) {
        console.error('[connectWhatsApp] Error:', error.message);
        return errorResponse(res, "Failed to connect WhatsApp", 500);
    }
};

module.exports = {
    sendOTP, verifyOTP, logout, getMe,
    updateProfile, submitOnboarding, connectWhatsApp,
    registerSendOTP, registerVerifyOTP,
    loginWithPassword, forgotPassword, resetPassword
};