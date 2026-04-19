require('dotenv').config();
const mongoose = require('mongoose');
const Broker = require('./src/models/Broker'); // 

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const existing = await Broker.findOne({ mobile: '9484572199', role: 'superadmin' });
    if (existing) {
        console.log('✅ Admin already exists:', existing.email);
        mongoose.disconnect();
        return;
    }

    const admin = await Broker.create({
        name: 'Kuldeep Singh',
        email: 'kuldeepsingh55210@gmail.com',
        mobile: '9484572199',
        password: 'Admin@2026',
        role: 'superadmin',
        isActive: true,
        subscription: {
            plan: 'business',
            leadsLimit: 999999,
            expiresAt: new Date('2099-12-31')
        }
    });

    console.log('✅ Superadmin created!');
    console.log('Email:', admin.email);
    console.log('Password: Admin@2026');
    mongoose.disconnect();
}).catch(err => console.error('❌ Error:', err.message));