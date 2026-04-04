const Broker = require('../models/Broker');
const otpService = require('../services/otp.service');
const jwtService = require('../services/jwt.service');
const { successResponse, errorResponse } = require('../utils/response');

const sendOTP = async (req, res, next) => {
    try {
        const { mobile, email, name } = req.body;

        if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile) || !email || !/^\S+@\S+\.\S+$/.test(email)) {
            return errorResponse(res, "Invalid mobile or email", 400);
        }

        let broker = await Broker.findOne({ mobile });
        if (!broker) {
            broker = new Broker({
                name: name || 'Broker',
                email,
                mobile
            });
            await broker.save();
        }

        const otp = otpService.generateOTP();
        await otpService.saveOTP(mobile, otp);
        const sent = await otpService.sendOTP(mobile, otp);

        if (!sent.success) {
            // OTP logged to console in development
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

module.exports = { sendOTP, verifyOTP, logout, getMe, updateProfile };