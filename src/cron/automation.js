const cron = require('node-cron');
const Broker = require('../models/Broker');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Reminder = require('../models/Reminder');
const whatsappService = require('../services/whatsapp.service');

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running hourly WhatsApp automation check...');

    try {
        const brokers = await Broker.find({ wa_connected: true });

        for (const broker of brokers) {
            const now = new Date();
            const leads = await Lead.find({ tenantId: broker.tenantId });

            for (const lead of leads) {
                if (!lead.lastInteraction) continue;

                const timeDiff = now.getTime() - lead.lastInteraction.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                let messageToSend = null;
                let isTemplate = false;
                let templateName = '';

                if (daysDiff === 1) {
                    messageToSend = `Hi ${lead.name}, just checking if you had any thoughts on the properties we discussed?`;
                } else if (daysDiff === 3) {
                    messageToSend = `Hi ${lead.name}, we have some new listings that match your criteria. Are you free for a quick call?`;
                } else if (daysDiff === 7) {
                    isTemplate = true;
                    templateName = 're_engagement_7d';
                }

                if (messageToSend || isTemplate) {
                    let success = false;
                    if (isTemplate) {
                        console.log(`[CRON] Sending 7d template to ${lead.phone}`);
                        const result = await whatsappService.sendTemplateMessage(
                            lead.phone,
                            templateName,
                            broker.wa_phone_number_id,
                            broker.wa_access_token
                        );
                        success = result.success;
                    } else {
                        console.log(`[CRON] Sending text to ${lead.phone} (Day ${daysDiff})`);
                        const result = await whatsappService.sendMessage(
                            lead.phone,
                            messageToSend,
                            broker.wa_phone_number_id,
                            broker.wa_access_token
                        );
                        success = result.success;
                    }

                    if (success) {
                        await Message.create({
                            tenantId: broker.tenantId,
                            leadId: lead._id,
                            direction: 'outbound',
                            content: isTemplate ? `[Template: ${templateName}] sent` : messageToSend,
                            status: 'sent'
                        });

                        lead.lastInteraction = new Date();
                        await lead.save();
                    }
                }
            }
        }
    } catch (error) {
        console.error('[CRON] Automation error:', error);
    }
});

// ✅ Reminder Check — Har minute run karo
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const dueReminders = await Reminder.find({
            remindAt: { $lte: now },
            isCompleted: false,
            notificationSent: false
        }).populate('leadId', 'name phone qualification')
          .populate('brokerId', 'mobile name');

        for (const reminder of dueReminders) {
            const broker = reminder.brokerId;
            const lead = reminder.leadId;

            if (!broker || !lead) continue;

            // ✅ WhatsApp notification broker ko bhejo
            const notificationText = `🔔 *Follow-up Reminder!*\n\n👤 *Lead:* ${lead.name}\n📱 *Phone:* ${lead.phone}\n📝 *Note:* ${reminder.note}\n\n🔗 View: https://app.narrowtech.in/leads`;

            const brokerPhone = '91' + broker.mobile;
            const result = await whatsappService.sendMessage(brokerPhone, notificationText);

            if (result.success) {
                console.log(`🔔 Reminder sent to broker ${broker.name} for lead ${lead.name}`);
            }

            // ✅ Mark notification sent
            reminder.notificationSent = true;
            await reminder.save();
        }
    } catch (error) {
        console.error('[CRON] Reminder check error:', error);
    }
});