const axios = require('axios');

const sendMessage = async (to, text) => {
    const pid = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v19.0/${pid}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: text }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ WhatsApp sendMessage Error:', JSON.stringify(error.response?.data, null, 2));
        return { success: false, error: error.response?.data || error.message };
    }
};

const sendTemplateMessage = async (to, templateName) => {
    const pid = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v19.0/${pid}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'en_US' }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ WhatsApp sendTemplateMessage Error:', JSON.stringify(error.response?.data, null, 2));
        return { success: false, error: error.response?.data || error.message };
    }
};

const verifyToken = async (phoneNumberId, accessToken) => {
    try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/${phoneNumberId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data || error.message };
    }
};

module.exports = {
    sendMessage,
    sendTemplateMessage,
    verifyToken
};