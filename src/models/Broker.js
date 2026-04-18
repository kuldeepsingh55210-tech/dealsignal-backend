const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const brokerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    gender: { type: String, enum: ['male', 'female', 'other'], default: null },
    city: { type: String, default: null },
    tenantId: { type: String, unique: true },
    role: { type: String, enum: ['broker', 'superadmin'], default: 'broker' },
    isActive: { type: Boolean, default: true },
    subscription: {
        plan: { type: String, enum: ['trial', 'starter', 'pro', 'business'], default: 'trial' },
        expiresAt: { type: Date },
        leadsLimit: { type: Number, default: 50 },
        leadsUsed: { type: Number, default: 0 },
        lastPaymentId: { type: String, default: null },
        lastOrderId: { type: String, default: null }
    },
    wa_phone_number_id: { type: String, default: null },
    wa_access_token: { type: String, default: null },
    wa_business_account_id: { type: String, default: null },
    wa_connected: { type: Boolean, default: false },
    wa_verified_phone: { type: String, default: null },
    lastActive: { type: Date },
    createdAt: { type: Date, default: Date.now },

    // ✅ Password Reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiry: { type: Date, default: null },

    // ✅ Onboarding fields
    onboarding: {
        completed: { type: Boolean, default: false },
        city: { type: String, default: null },
        experience: { type: String, default: null },
        propertyType: { type: String, enum: ['residential', 'commercial', 'both'], default: null },
        dealType: { type: String, enum: ['buy', 'rent', 'both'], default: null },
        monthlyLeads: { type: String, default: null },
        leadSource: { type: String, default: null },
        painPoint: { type: String, default: null },
    }
});

// ✅ Password hash before save
brokerSchema.pre('save', async function (next) {
    if (!this.tenantId) {
        this.tenantId = crypto.randomUUID();
    }
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// ✅ Password compare method
brokerSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Broker', brokerSchema);