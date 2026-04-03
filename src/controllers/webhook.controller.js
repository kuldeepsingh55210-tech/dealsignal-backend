const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Broker = require('../models/Broker');
const whatsappService = require('../services/whatsapp.service');

const { successResponse, errorResponse } = require('../utils/response');

// Verify webhook from Meta
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// Handle incoming messages
const handleIncomingMessage = async (req, res) => {
    res.status(200).send('EVENT_RECEIVED');

    try {
        const body = req.body;
        if (body.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.value && change.value.messages) {
                    const message = change.value.messages[0];
                    const contact = change.value.contacts?.[0];
                    const metadata = change.value.metadata;
                    const from = message.from;
                    const messageBody = message.text?.body || '';
                    const messageId = message.id;

                    // Identify which broker this message belongs to via phone_number_id
                    const phoneNumberId = metadata?.phone_number_id;
                    if (!phoneNumberId) {
                        console.warn('⚠️ Webhook missing phone_number_id in metadata, skipping.');
                        continue;
                    }

                    let broker = await Broker.findOne({ wa_phone_number_id: phoneNumberId, wa_connected: true });
                    if (!broker) {
                        console.warn(`⚠️ No connected broker found for phone_number_id: ${phoneNumberId}. Falling back to default broker.`);
                        broker = await Broker.findOne(); // Grab first available broker
                        if (!broker) {
                            console.error('❌ No brokers exist in the database. Cannot assign lead.');
                            continue;
                        }
                    }

                    const tenantId = broker.tenantId;
                    console.log(`📩 Incoming from ${from} for tenant ${tenantId}: "${messageBody}"`);

                    // Find or create Lead scoped to this tenant
                    let lead = await Lead.findOne({ phone: from, tenantId });
                    if (!lead) {
                        lead = await Lead.create({
                            tenantId,
                            phone: from,
                            name: contact?.profile?.name || 'Unknown',
                            status: 'new',
                            source: 'whatsapp',
                            qualificationStep: 0,
                            qualification: {}
                        });
                        console.log(`🆕 New lead created: ${lead._id} for tenant ${tenantId}`);
                    }

                    // Save inbound message
                    await Message.create({
                        tenantId,
                        leadId: lead._id,
                        direction: 'inbound',
                        content: messageBody,
                        status: 'delivered',
                        waMessageId: messageId
                    });

                    // State Machine
                    const msg = messageBody.trim().toLowerCase();
                    let replyText = '';

                    switch (lead.qualificationStep) {
                        case 0:
                            replyText = `Namaste! 🙏 Aap kya chahte hain?\n1️⃣ Property Kharidna (Buy)\n2️⃣ Kiraye Par Lena (Rent)`;
                            lead.qualificationStep = 1;
                            break;
                        case 1:
                            if (msg === '1' || msg.includes('buy') || msg.includes('kharidna') || msg.includes('1️⃣')) {
                                lead.qualification.category = 'buy';
                                replyText = `Kaun si property chahiye?\n🏗️ 1. Plot\n🏢 2. Flat\n🏡 3. Bana Hua Ghar`;
                                lead.qualificationStep = 2;
                            } else if (msg === '2' || msg.includes('rent') || msg.includes('kiraye') || msg.includes('2️⃣')) {
                                lead.qualification.category = 'rent';
                                replyText = `Kaun sa kiraye par chahiye?\n🚪 1. Single Room\n🏢 2. Flat\n🏡 3. Poora Ghar`;
                                lead.qualificationStep = 2;
                            } else {
                                replyText = `Kripya sahi number chunein:\n1️⃣ Property Kharidna (Buy)\n2️⃣ Kiraye Par Lena (Rent)`;
                            }
                            break;
                        case 2:
                            if (lead.qualification.category === 'buy') {
                                if (msg === '1' || msg.includes('plot')) lead.qualification.propertyType = 'plot';
                                else if (msg === '2' || msg.includes('flat')) lead.qualification.propertyType = 'flat';
                                else if (msg === '3' || msg.includes('ghar')) lead.qualification.propertyType = 'ghar';
                                else lead.qualification.propertyType = messageBody;
                            } else {
                                if (msg === '1' || msg.includes('single') || msg.includes('room')) lead.qualification.propertyType = 'single_room';
                                else if (msg === '2' || msg.includes('flat')) lead.qualification.propertyType = 'flat';
                                else if (msg === '3' || msg.includes('ghar')) lead.qualification.propertyType = 'home';
                                else lead.qualification.propertyType = messageBody;
                            }
                            replyText = `📍 Kahan chahiye? (Location/Area)`;
                            lead.qualificationStep = 3;
                            break;
                        case 3:
                            lead.qualification.location = messageBody;
                            replyText = `📐 Kitne square foot chahiye?`;
                            lead.qualificationStep = 4;
                            break;
                        case 4:
                            lead.qualification.squareFoot = messageBody;
                            replyText = lead.qualification.category === 'buy' ? `💰 Aapka budget kya hai?` : `💰 Monthly rent budget kya hai?`;
                            lead.qualificationStep = 5;
                            break;
                        case 5:
                            lead.qualification.budget = messageBody;
                            replyText = `⭐ Koi khas preference hai?`;
                            lead.qualificationStep = 6;
                            break;
                        case 6:
                            lead.qualification.preference = messageBody;
                            replyText = lead.qualification.category === 'buy' ? `📅 Kab tak lena chahte hain?` : `📅 Kab se chahiye?`;
                            lead.qualificationStep = 7;
                            break;
                        case 7:
                            lead.qualification.timeline = messageBody;
                            replyText = `💼 Aap kya kaam karte hain?`;
                            lead.qualificationStep = 8;
                            break;
                        case 8:
                            lead.qualification.occupation = messageBody;

                            // Auto Categorization
                            let score = 'warm';
                            let tline = lead.qualification.timeline.toLowerCase();

                            if (tline.includes('1') || tline.includes('2') || tline.includes('3') || tline.includes('jald') || tline.includes('immediately') || tline.includes('soon')) {
                                score = 'hot';
                            } else if (tline.includes('4') || tline.includes('5') || tline.includes('6')) {
                                score = 'warm';
                            } else {
                                score = 'cold';
                            }

                            lead.qualification.leadScore = score;
                            lead.status = 'qualified';

                            replyText = `✅ Shukriya! Aapki details note kar li gayi hain.\nHamara broker jald aapse contact karega. 🏠`;
                            lead.qualificationStep = 9;
                            break;
                        default:
                            lead.lastInteraction = new Date();
                            await lead.save();
                            continue;
                    }

                    lead.lastInteraction = new Date();
                    await lead.save();

                    if (replyText) {
                        const sendResult = await whatsappService.sendMessage(
                            from,
                            replyText
                        );
                        console.log(`📤 Reply sent: ${sendResult.success ? '✅' : '❌'}`);

                        await Message.create({
                            tenantId,
                            leadId: lead._id,
                            direction: 'outbound',
                            content: replyText,
                            status: sendResult.success ? 'sent' : 'failed'
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Webhook Error:', error.message);
    }
};

// @desc    Get all messages for a specific lead
// @route   GET /api/messages/:leadId
// @access  Private
const getMessagesByLead = async (req, res) => {
    try {
        const { leadId } = req.params;
        const tenantId = req.broker.tenantId;

        // Verify lead belongs to this tenant
        const lead = await Lead.findOne({ _id: leadId, tenantId });
        if (!lead) {
            return errorResponse(res, 'Lead not found', 404);
        }

        const messages = await Message.find({ leadId, tenantId }).sort({ createdAt: 1 });
        return successResponse(res, messages, 'Messages fetched successfully', 200);
    } catch (error) {
        console.error('[getMessagesByLead] Error:', error.message);
        return errorResponse(res, 'Error fetching messages', 500);
    }
};

// @desc    Send a manual message from the dashboard
// @route   POST /api/whatsapp/send
// @access  Private
const sendManualMessage = async (req, res) => {
    try {
        const { to, message } = req.body;
        const tenantId = req.broker.tenantId;

        if (!to || !message) {
            return errorResponse(res, 'Phone number and message are required', 400);
        }

        const lead = await Lead.findOne({ phone: to, tenantId });
        if (!lead) {
            return errorResponse(res, 'Lead not found for this tenant', 404);
        }

        // Send via WhatsApp Service
        const sendResult = await whatsappService.sendMessage(
            to,
            message
        );

        if (!sendResult.success) {
            return errorResponse(res, `Failed to send message: ${JSON.stringify(sendResult.error)}`, 500);
        }

        // Save outbound message
        const newMessage = await Message.create({
            tenantId,
            leadId: lead._id,
            direction: 'outbound',
            content: message,
            status: 'sent'
        });

        // Update lead interaction
        lead.lastInteraction = new Date();
        await lead.save();

        return successResponse(res, newMessage, 'Message sent successfully', 200);
    } catch (error) {
        console.error('[sendManualMessage] Error:', error.message);
        return errorResponse(res, 'Internal server error sending message', 500);
    }
};

module.exports = {
    verifyWebhook,
    handleIncomingMessage,
    getMessagesByLead,
    sendManualMessage
};
