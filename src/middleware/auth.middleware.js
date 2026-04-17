const jwtService = require('../services/jwt.service');
const Broker = require('../models/Broker');
const { errorResponse } = require('../utils/response');

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return errorResponse(res, "Not authenticated", 401);
        }

        const decoded = jwtService.verifyToken(token);
        if (!decoded) {
            return errorResponse(res, "Token invalid or expired", 401);
        }

        const broker = await Broker.findOne({ _id: decoded.brokerId, isActive: true });
        if (!broker) {
            return errorResponse(res, "Account not found or deactivated", 401);
        }

        // ✅ Subscription check (superadmin ko exempt karo)
        if (broker.role !== 'superadmin') {
            const now = new Date();
            if (broker.subscription?.expiresAt && broker.subscription.expiresAt < now) {
                return errorResponse(res, "Subscription expired. Please renew your plan.", 403);
            }
        }

        req.broker = broker;
        req.tenant = {
            id: broker.tenantId,
            brokerId: broker._id,
            role: broker.role
        };
        next();
    } catch (error) {
        return errorResponse(res, "Not authenticated", 401);
    }
};

const adminOnly = (req, res, next) => {
    if (req.tenant && req.tenant.role === 'superadmin') {
        next();
    } else {
        return errorResponse(res, "Admin access required", 403);
    }
};

module.exports = { protect, adminOnly };