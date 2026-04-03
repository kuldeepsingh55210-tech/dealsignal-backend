const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const VERIFY_TOKEN = 'dealsignal_verify_2026';

async function runTests() {
    console.log('===================================================');
    console.log('          DealSignal Backend API Test Report       ');
    console.log('===================================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Health Check
    try {
        console.log('🔄 Running Test 1: Health Check (GET /api/health)');
        const res = await axios.get(`${BASE_URL}/health`);
        console.log(`✅ PASSED. Response: ${JSON.stringify(res.data)}\n`);
        passed++;
    } catch (e) {
        console.error(`❌ FAILED. Error: ${e.message}\n`);
        failed++;
    }

    // Test 2: Send OTP
    try {
        console.log('🔄 Running Test 2: Send OTP (POST /api/auth/send-otp)');
        console.log('   Payload: {"phone": "9696858320"}');
        const res = await axios.post(`${BASE_URL}/auth/send-otp`, { phone: '9696858320' });
        console.log(`✅ PASSED. Response: ${JSON.stringify(res.data)}\n`);
        passed++;
    } catch (e) {
        console.error(`❌ FAILED. Response: ${JSON.stringify(e.response?.data || e.message)}`);
        console.log(`   💡 FIX NEEDED: The Auth Controller (auth.controller.js) strictly expects "mobile", "email", and "name" in the payload, not "phone". Let's test with the correct payload...\n`);
        failed++;

        try {
            console.log('🔄 Running Test 2.1: Send OTP with correct payload');
            const res2 = await axios.post(`${BASE_URL}/auth/send-otp`, {
                mobile: '9696858320',
                email: 'test@dealsignal.com',
                name: 'Test Broker'
            });
            console.log(`✅ PASSED. Response: ${JSON.stringify(res2.data)}\n`);
            passed++;
        } catch (e2) {
            console.error(`❌ FAILED Test 2.1. Response: ${JSON.stringify(e2.response?.data || e2.message)}\n`);
            failed++;
        }
    }

    // Test 3: Webhook Verify
    try {
        console.log(`🔄 Running Test 3: Webhook Verify (GET /api/whatsapp)`);
        const url = `${BASE_URL}/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=TEST123`;
        const res = await axios.get(url);
        console.log(`✅ PASSED. Response: ${res.data}\n`);
        passed++;
    } catch (e) {
        console.error(`❌ FAILED. Response: ${JSON.stringify(e.response?.data || e.message)}`);
        if (e.response?.status === 404) {
            console.log(`   💡 FIX NEEDED: The route '/api/whatsapp' is returning 404. Check if 'whatsapp.routes.js' or 'webhook.routes.js' is properly mounted in 'server.js'.\n`);
        } else {
            console.log();
        }
        failed++;
    }

    // Test 4: Webhook Incoming Message
    try {
        console.log(`🔄 Running Test 4: Incoming Webhook Message (POST /api/whatsapp)`);
        const payload = {
            object: "whatsapp_business_account",
            entry: [{
                changes: [{
                    value: {
                        metadata: {
                            display_phone_number: "919696858320",
                            phone_number_id: "phonenumberid123"
                        },
                        contacts: [{
                            profile: {
                                name: "Test User"
                            },
                            wa_id: "919696858320"
                        }],
                        messages: [{
                            from: "919696858320",
                            id: "wamid.123",
                            type: "text",
                            text: { body: "Hello DealSignal" }
                        }]
                    }
                }]
            }]
        };
        const res = await axios.post(`${BASE_URL}/whatsapp`, payload);
        console.log(`✅ PASSED. Response: ${JSON.stringify(res.data)}\n`);
        passed++;
    } catch (e) {
        console.error(`❌ FAILED. Response: ${JSON.stringify(e.response?.data || e.message)}`);
        if (e.response?.status === 404) {
            console.log(`   💡 FIX NEEDED: The POST route '/api/whatsapp' is returning 404. Ensure routes are mounted in server.js.\n`);
        } else {
            console.log();
        }
        failed++;
    }

    console.log('===================================================');
    console.log(`                  SUMMARY REPORT                   `);
    console.log(`          TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('===================================================\n');
}

runTests();
