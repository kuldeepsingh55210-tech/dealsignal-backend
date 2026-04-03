const axios = require('axios');
const mongoose = require('mongoose');
const Broker = require('./src/models/Broker');
const Lead = require('./src/models/Lead');
const Message = require('./src/models/Message');
require('dotenv').config();

const testWebhookSequence = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealsignal');
        console.log('MongoDB connected');

        // Create a test broker to fulfill the matching logic
        const testPhoneNumberId = "phonenumberid123";
        let broker = await Broker.findOne({ wa_phone_number_id: testPhoneNumberId });
        if (!broker) {
            broker = await Broker.create({
                tenantId: "t-test123",
                name: "Test Broker",
                email: "test@broker.com",
                mobile: "1234567890",
                wa_phone_number_id: testPhoneNumberId,
                wa_connected: true
            });
            console.log('Test Broker created', broker.tenantId);
        }

        const userPhone = "919696858320";

        // Helper to send message
        const sendMessageEvent = async (text) => {
            const req = {
                body: {
                    object: "whatsapp_business_account",
                    entry: [{
                        changes: [{
                            value: {
                                metadata: {
                                    display_phone_number: "919696858320",
                                    phone_number_id: testPhoneNumberId
                                },
                                contacts: [{
                                    profile: { name: "Test User" },
                                    wa_id: userPhone
                                }],
                                messages: [{
                                    from: userPhone,
                                    id: `wamid_${Date.now()}`,
                                    type: "text",
                                    text: { body: text }
                                }]
                            }
                        }]
                    }]
                }
            };

            const res = {
                status: (code) => ({ send: () => { } }),
                sendStatus: () => { }
            };

            const webhookController = require('./src/controllers/webhook.controller');
            await webhookController.handleIncomingMessage(req, res);

            // Artificial delay to allow async DB saves to complete since handleIncomingMessage might not block
            await new Promise(r => setTimeout(r, 100));
            console.log(`Sent message: "${text}"`);
        };

        // Clear existing leads and messages for clean test
        await Lead.deleteMany({ phone: userPhone });
        await Message.deleteMany({});

        console.log('\n--- Step 0: User sends first message ---');
        await sendMessageEvent('Hello!');
        let lead = await Lead.findOne({ phone: userPhone });
        console.log(`Lead step: ${lead.qualificationStep} (Expected: 1)`);

        console.log('\n--- Step 1: User replies with budget ---');
        await sendMessageEvent('50 Lakh');
        lead = await Lead.findOne({ phone: userPhone });
        console.log(`Lead step: ${lead.qualificationStep} (Expected: 2), Budget: ${lead.qualification.budget}`);

        console.log('\n--- Step 2: User replies with location ---');
        await sendMessageEvent('Mumbai');
        lead = await Lead.findOne({ phone: userPhone });
        console.log(`Lead step: ${lead.qualificationStep} (Expected: 3), Location: ${lead.qualification.location}`);

        console.log('\n--- Step 3: User replies with property type ---');
        await sendMessageEvent('Flat');
        lead = await Lead.findOne({ phone: userPhone });
        console.log(`Lead step: ${lead.qualificationStep} (Expected: 4), Property Type: ${lead.qualification.propertyType}`);
        console.log(`Lead status: ${lead.status} (Expected: qualified)`);

        console.log('\n--- Messages Log ---');
        const msgs = await Message.find({ leadId: lead._id }).sort({ createdAt: 1 });
        msgs.forEach(m => console.log(`[${m.direction}] ${m.content}`));

        mongoose.connection.close();
        console.log('\n✅ Script Complete.');
    } catch (err) {
        console.error('Test Error:', err.response?.data || err.stack || err.message);
        mongoose.connection.close();
    }
};

testWebhookSequence();
