const Broker = require('../models/Broker');
const otpService = require('../services/otp.service');
const jwtService = require('../services/jwt.service');
const { successResponse, errorResponse } = require('../utils/response');
const axios = require('axios');

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

// ✅ WhatsApp Embedded Signup — Connect karo
const connectWhatsApp = async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return errorResponse(res, "Authorization code missing", 400);
        }

        // Code ko access token mein exchange karo
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

        // WhatsApp Business Account details lo
        const waResponse = await axios.get(
            `https://graph.facebook.com/v19.0/me/businesses`,
            {
                params: { access_token: accessToken }
            }
        );

        const waAccountId = waResponse.data.data?.[0]?.id;

        // Phone number ID lo
        const phoneResponse = await axios.get(
            `https://graph.facebook.com/v19.0/${waAccountId}/phone_numbers`,
            {
                params: { access_token: accessToken }
            }
        );

        const phoneNumberId = phoneResponse.data.data?.[0]?.id;
        const verifiedPhone = phoneResponse.data.data?.[0]?.display_phone_number;

        // Broker update karo
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
    updateProfile, submitOnboarding, connectWhatsApp
};