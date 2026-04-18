const Razorpay = require('razorpay');
const crypto = require('crypto');
const Broker = require('../models/Broker');
const { successResponse, errorResponse } = require('../utils/response');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ Plans Configuration
const PLANS = {
    starter_monthly: {
        name: 'Starter Monthly',
        amount: 299900, // ₹2999 in paise
        currency: 'INR',
        plan: 'starter',
        duration: 30,
        leadsLimit: 1200
    },
    starter_yearly: {
        name: 'Starter Yearly',
        amount: 2699000, // ₹26,990 in paise
        currency: 'INR',
        plan: 'starter',
        duration: 365,
        leadsLimit: 1200
    },
    pro_monthly: {
        name: 'Pro Monthly',
        amount: 499900, // ₹4999 in paise
        currency: 'INR',
        plan: 'pro',
        duration: 30,
        leadsLimit: 3000
    },
    pro_yearly: {
        name: 'Pro Yearly',
        amount: 4499000, // ₹44,990 in paise
        currency: 'INR',
        plan: 'pro',
        duration: 365,
        leadsLimit: 3000
    },
    business_monthly: {
        name: 'Business Monthly',
        amount: 999900, // ₹9999 in paise
        currency: 'INR',
        plan: 'business',
        duration: 30,
        leadsLimit: -1 // unlimited
    },
    business_yearly: {
        name: 'Business Yearly',
        amount: 8999000, // ₹89,990 in paise
        currency: 'INR',
        plan: 'business',
        duration: 365,
        leadsLimit: -1 // unlimited
    }
};

// ✅ Create Order
const createOrder = async (req, res) => {
    try {
        const { planId } = req.body;

        if (!PLANS[planId]) {
            return errorResponse(res, 'Invalid plan selected', 400);
        }

        const plan = PLANS[planId];

        const order = await razorpay.orders.create({
            amount: plan.amount,
            currency: plan.currency,
            receipt: `receipt_${req.broker._id}_${Date.now()}`,
            notes: {
                brokerId: req.broker._id.toString(),
                planId: planId,
                brokerEmail: req.broker.email
            }
        });

        return successResponse(res, {
            orderId: order.id,
            amount: plan.amount,
            currency: plan.currency,
            planName: plan.name,
            keyId: process.env.RAZORPAY_KEY_ID
        }, 'Order created successfully');
    } catch (error) {
        console.error('[createOrder] Error:', error.message);
        return errorResponse(res, 'Error creating payment order', 500);
    }
};

// ✅ Verify Payment + Update Subscription
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId
        } = req.body;

        // Signature verify karo
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return errorResponse(res, 'Payment verification failed', 400);
        }

        const plan = PLANS[planId];
        if (!plan) {
            return errorResponse(res, 'Invalid plan', 400);
        }

        // Subscription update karo
        const broker = await Broker.findById(req.broker._id);

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(now.getDate() + plan.duration);

        broker.subscription = {
            plan: plan.plan,
            expiresAt: expiresAt,
            leadsLimit: plan.leadsLimit,
            leadsUsed: 0,
            lastPaymentId: razorpay_payment_id,
            lastOrderId: razorpay_order_id
        };

        await broker.save();

        const brokerData = broker.toObject();
        delete brokerData.password;
        delete brokerData.wa_access_token;
        delete brokerData.__v;

        return successResponse(res, brokerData, `${plan.name} plan activated successfully! 🎉`);
    } catch (error) {
        console.error('[verifyPayment] Error:', error.message);
        return errorResponse(res, 'Error verifying payment', 500);
    }
};

// ✅ Get Plans
const getPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: 'starter',
                name: 'Starter',
                monthlyPrice: 2999,
                yearlyPrice: 26990,
                leadsLimit: 1200,
                features: [
                    'WhatsApp Bot Active',
                    '1,200 Leads/month',
                    'HOT/WARM/COLD Scoring',
                    'Full Dashboard',
                    'Lead Export',
                    'Follow-up Reminders',
                    'Email Support'
                ]
            },
            {
                id: 'pro',
                name: 'Pro',
                monthlyPrice: 4999,
                yearlyPrice: 44990,
                leadsLimit: 3000,
                popular: true,
                features: [
                    'WhatsApp Bot Active',
                    '3,000 Leads/month',
                    'HOT/WARM/COLD Scoring',
                    'Full Dashboard',
                    'Lead Export',
                    'Follow-up Reminders',
                    'Analytics Dashboard',
                    'WhatsApp Notifications',
                    'Priority Support'
                ]
            },
            {
                id: 'business',
                name: 'Business',
                monthlyPrice: 9999,
                yearlyPrice: 89990,
                leadsLimit: -1,
                features: [
                    'WhatsApp Bot Active',
                    'Unlimited Leads',
                    'HOT/WARM/COLD Scoring',
                    'Full Dashboard',
                    'Lead Export',
                    'Follow-up Reminders',
                    'Analytics Dashboard',
                    'WhatsApp Notifications',
                    '3 Team Members',
                    'Dedicated Support'
                ]
            }
        ];

        return successResponse(res, plans, 'Plans fetched successfully');
    } catch (error) {
        return errorResponse(res, 'Error fetching plans', 500);
    }
};

module.exports = { createOrder, verifyPayment, getPlans };