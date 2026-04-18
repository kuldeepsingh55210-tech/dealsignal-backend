const Reminder = require('../models/Reminder');
const Lead = require('../models/Lead');
const { successResponse, errorResponse } = require('../utils/response');

// ✅ Create Reminder
const createReminder = async (req, res) => {
    try {
        const { leadId, note, remindAt } = req.body;
        const tenantId = req.broker.tenantId;
        const brokerId = req.broker._id;

        if (!leadId || !note || !remindAt) {
            return errorResponse(res, 'leadId, note aur remindAt chahiye', 400);
        }

        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            return errorResponse(res, 'Lead not found', 404);
        }

        const reminder = await Reminder.create({
            tenantId,
            leadId,
            brokerId,
            note,
            remindAt: new Date(remindAt)
        });

        return successResponse(res, reminder, 'Reminder set ho gaya!', 201);
    } catch (error) {
        console.error('[createReminder] Error:', error.message);
        return errorResponse(res, 'Error creating reminder', 500);
    }
};

// ✅ Get All Reminders
const getReminders = async (req, res) => {
    try {
        const tenantId = req.broker.tenantId;

        const reminders = await Reminder.find({ tenantId })
            .populate('leadId', 'name phone qualification')
            .sort({ remindAt: 1 });

        return successResponse(res, reminders, 'Reminders fetched', 200);
    } catch (error) {
        console.error('[getReminders] Error:', error.message);
        return errorResponse(res, 'Error fetching reminders', 500);
    }
};

// ✅ Delete Reminder
const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.broker.tenantId;

        const reminder = await Reminder.findOneAndDelete({ _id: id, tenantId });
        if (!reminder) {
            return errorResponse(res, 'Reminder not found', 404);
        }

        return successResponse(res, null, 'Reminder delete ho gaya!', 200);
    } catch (error) {
        console.error('[deleteReminder] Error:', error.message);
        return errorResponse(res, 'Error deleting reminder', 500);
    }
};

// ✅ Mark Complete
const completeReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.broker.tenantId;

        const reminder = await Reminder.findOneAndUpdate(
            { _id: id, tenantId },
            { isCompleted: true },
            { new: true }
        );

        if (!reminder) {
            return errorResponse(res, 'Reminder not found', 404);
        }

        return successResponse(res, reminder, 'Reminder complete ho gaya!', 200);
    } catch (error) {
        console.error('[completeReminder] Error:', error.message);
        return errorResponse(res, 'Error completing reminder', 500);
    }
};

module.exports = { createReminder, getReminders, deleteReminder, completeReminder };