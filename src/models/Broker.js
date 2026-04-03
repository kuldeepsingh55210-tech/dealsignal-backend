const mongoose = require('mongoose');
const crypto = require('crypto');

const brokerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    tenantId: { type: String, unique: true },
    role: { type: String, enum: ['broker', 'superadmin'], default: 'broker' },
    isActive: { type: Boolean, default: true },
    subscription: {
        plan: { type: String, enum: ['trial', 'basic', 'pro'], default: 'trial' },
        expiresAt: { type: Date }
    },
    wa_phone_number_id: { type: String, default: null },
    wa_access_token: { type: String, default: null },
    wa_business_account_id: { type: String, default: null },
    wa_connected: { type: Boolean, default: false },
    wa_verified_phone: { type: String, default: null },
    lastActive: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

brokerSchema.pre('save', function (next) {
    if (!this.tenantId) {
        this.tenantId = crypto.randomUUID();
    }
    next();
});

module.exports = mongoose.model('Broker', brokerSchema);
