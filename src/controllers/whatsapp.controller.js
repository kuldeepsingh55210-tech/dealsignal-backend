const Broker = require('../models/Broker');
const whatsappService = require('../services/whatsapp.service');

const connectWhatsApp = async (req, res, next) => {
    try {
        const { wa_phone_number_id, wa_access_token, wa_business_account_id } = req.body;

        if (!wa_phone_number_id || !wa_access_token) {
            return res.status(400).json({ success: false, message: 'Phone Number ID and Access Token are required' });
        }

        // Verify token with Meta Graph API
        const verification = await whatsappService.verifyToken(wa_phone_number_id, wa_access_token);

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp credentials',
                details: verification.error
            });
        }

        // Update broker
        const broker = await Broker.findByIdAndUpdate(
            req.broker._id,
            {
                wa_phone_number_id,
                wa_access_token,
                wa_business_account_id,
                wa_connected: true
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            connected: true,
            phone: verification.data.display_phone_number || 'verified'
        });
    } catch (error) {
        next(error);
    }
};

const getStatus = async (req, res, next) => {
    try {
        const broker = await Broker.findById(req.broker._id);

        if (!broker) {
            return res.status(404).json({ success: false, message: 'Broker not found' });
        }

        res.status(200).json({
            success: true,
            connected: broker.wa_connected,
            phone_number_id: broker.wa_phone_number_id,
            business_account_id: broker.wa_business_account_id
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    connectWhatsApp,
    getStatus
};
