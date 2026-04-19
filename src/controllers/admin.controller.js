const Broker = require('../models/Broker');
const Lead = require('../models/Lead');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get overall stats
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const totalBrokers = await Broker.countDocuments({ role: 'broker' });
        const activeBrokers = await Broker.countDocuments({ role: 'broker', isActive: true });
        const totalLeads = await Lead.countDocuments();

        const planStats = await Broker.aggregate([
            { $match: { role: 'broker' } },
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]);

        const recentBrokers = await Broker.find({ role: 'broker' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email mobile subscription.plan createdAt isActive');

        return successResponse(res, {
            totalBrokers,
            activeBrokers,
            totalLeads,
            planStats,
            recentBrokers
        }, 'Stats fetched', 200);
    } catch (error) {
        console.error('[getStats] Error:', error.message);
        return errorResponse(res, 'Error fetching stats', 500);
    }
};

// @desc    Get all brokers
// @route   GET /api/admin/brokers
const getAllBrokers = async (req, res) => {
    try {
        const brokers = await Broker.find({ role: 'broker' })
            .sort({ createdAt: -1 })
            .select('-password -resetPasswordToken -resetPasswordExpiry -wa_access_token');

        return successResponse(res, brokers, 'Brokers fetched', 200);
    } catch (error) {
        console.error('[getAllBrokers] Error:', error.message);
        return errorResponse(res, 'Error fetching brokers', 500);
    }
};

// @desc    Get broker details
// @route   GET /api/admin/brokers/:id
const getBrokerDetails = async (req, res) => {
    try {
        const broker = await Broker.findById(req.params.id)
            .select('-password -resetPasswordToken -resetPasswordExpiry -wa_access_token');

        if (!broker) return errorResponse(res, 'Broker not found', 404);

        const totalLeads = await Lead.countDocuments({ tenantId: broker.tenantId });
        const hotLeads = await Lead.countDocuments({ tenantId: broker.tenantId, 'qualification.leadScore': 'hot' });
        const warmLeads = await Lead.countDocuments({ tenantId: broker.tenantId, 'qualification.leadScore': 'warm' });
        const coldLeads = await Lead.countDocuments({ tenantId: broker.tenantId, 'qualification.leadScore': 'cold' });

        return successResponse(res, {
            broker,
            leadStats: { totalLeads, hotLeads, warmLeads, coldLeads }
        }, 'Broker details fetched', 200);
    } catch (error) {
        console.error('[getBrokerDetails] Error:', error.message);
        return errorResponse(res, 'Error fetching broker details', 500);
    }
};

// @desc    Update broker status (activate/deactivate)
// @route   PATCH /api/admin/brokers/:id/status
const updateBrokerStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        const broker = await Broker.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        ).select('-password');

        if (!broker) return errorResponse(res, 'Broker not found', 404);

        return successResponse(res, broker, `Broker ${isActive ? 'activated' : 'deactivated'}`, 200);
    } catch (error) {
        console.error('[updateBrokerStatus] Error:', error.message);
        return errorResponse(res, 'Error updating broker status', 500);
    }
};

// @desc    Update broker subscription
// @route   PATCH /api/admin/brokers/:id/subscription
const updateBrokerSubscription = async (req, res) => {
    try {
        const { plan, expiresAt } = req.body;

        const planLimits = {
            trial: 50,
            starter: 1200,
            pro: 3000,
            business: 999999
        };

        const broker = await Broker.findByIdAndUpdate(
            req.params.id,
            {
                'subscription.plan': plan,
                'subscription.leadsLimit': planLimits[plan],
                'subscription.expiresAt': expiresAt ? new Date(expiresAt) : null
            },
            { new: true }
        ).select('-password');

        if (!broker) return errorResponse(res, 'Broker not found', 404);

        return successResponse(res, broker, 'Subscription updated', 200);
    } catch (error) {
        console.error('[updateBrokerSubscription] Error:', error.message);
        return errorResponse(res, 'Error updating subscription', 500);
    }
};

// @desc    Get all leads
// @route   GET /api/admin/leads
const getAllLeads = async (req, res) => {
    try {
        const { tenantId, score, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (tenantId) filter.tenantId = tenantId;
        if (score) filter['qualification.leadScore'] = score;

        const leads = await Lead.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Lead.countDocuments(filter);

        return successResponse(res, { leads, total, page: Number(page) }, 'Leads fetched', 200);
    } catch (error) {
        console.error('[getAllLeads] Error:', error.message);
        return errorResponse(res, 'Error fetching leads', 500);
    }
};

module.exports = {
    getStats,
    getAllBrokers,
    getBrokerDetails,
    updateBrokerStatus,
    updateBrokerSubscription,
    getAllLeads
};