const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    tenantId: { type: String, index: true },
    name: { type: String, default: 'Unknown' },
    phone: { type: String, required: true },
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'lost', 'HOT', 'WARM', 'COLD'], default: 'new' },
    source: { type: String, default: 'whatsapp' },
    notes: { type: String },
    qualificationStep: { type: Number, default: 0 },
    qualification: {
        category: { type: String, enum: ['buy', 'rent'] },
        propertyType: String,
        location: String,
        squareFoot: String,
        budget: String,
        preference: String,
        timeline: String,
        occupation: String,
        leadScore: { type: String, enum: ['hot', 'warm', 'cold'] }
    },
    lastInteraction: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);