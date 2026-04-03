const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    tenantId: { type: String, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
    waMessageId: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);