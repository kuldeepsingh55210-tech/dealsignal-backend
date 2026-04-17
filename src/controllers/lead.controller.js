const Lead = require('../models/Lead');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get all leads for the current tenant
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res) => {
    try {
        const tenantId = req.broker.tenantId;

        const filter = { tenantId };
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const leads = await Lead.find(filter).sort({ createdAt: -1 });
        return successResponse(res, leads, 'Leads fetched successfully', 200);
    } catch (error) {
        console.error('[getLeads] Error:', error.message);
        return errorResponse(res, 'Error fetching leads', 500);
    }
};

// @desc    Get lead statistics for the dashboard
// @route   GET /api/leads/stats
// @access  Private
const getLeadStats = async (req, res) => {
    try {
        const tenantId = req.broker.tenantId;

        const total = await Lead.countDocuments({ tenantId });
        const hot = await Lead.countDocuments({ tenantId, status: 'HOT' });
        const qualified = await Lead.countDocuments({ tenantId, status: 'qualified' });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const newToday = await Lead.countDocuments({
            tenantId,
            createdAt: { $gte: startOfDay }
        });

        return successResponse(res, { total, hot, qualified, newToday }, 'Lead stats fetched successfully', 200);
    } catch (error) {
        console.error('[getLeadStats] Error:', error.message);
        return errorResponse(res, 'Error fetching lead stats', 500);
    }
};

// ✅ @desc    Update lead status + notes
// @route   PATCH /api/leads/:id
// @access  Private
const updateLead = async (req, res) => {
    try {
        const tenantId = req.broker.tenantId;
        const { id } = req.params;
        const { status, notes } = req.body;

        const lead = await Lead.findOne({ _id: id, tenantId });
        if (!lead) {
            return errorResponse(res, 'Lead not found', 404);
        }

        if (status) lead.status = status;
        if (notes !== undefined) lead.notes = notes;
        lead.lastInteraction = new Date();

        await lead.save();
        return successResponse(res, lead, 'Lead updated successfully', 200);
    } catch (error) {
        console.error('[updateLead] Error:', error.message);
        return errorResponse(res, 'Error updating lead', 500);
    }
};

module.exports = {
    getLeads,
    getLeadStats,
    updateLead
};