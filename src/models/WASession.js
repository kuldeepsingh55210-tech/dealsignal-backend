const mongoose = require('mongoose');

const waSessionSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['connected', 'disconnected', 'pending'], default: 'pending' },
    lastActive: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('WASession', waSessionSchema);
