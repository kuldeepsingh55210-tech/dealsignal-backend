const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    brokerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Broker', required: true },
    note: { type: String, required: true },
    remindAt: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    notificationSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);