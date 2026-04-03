const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/dealsignal';

        // Production-grade connection options
        const options = {
            serverSelectionTimeoutMS: 10000,   // Give Atlas 10 seconds to respond
            socketTimeoutMS: 45000,            // Close sockets after 45 seconds of inactivity
            maxPoolSize: 50,                   // Connection pool size
            retryWrites: true,                 // Retry failed writes automatically (Atlas default)
        };

        mongoose.connection.on('connected', () => {
            console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB Connection Error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB Reconnected successfully.');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed on app termination.');
            process.exit(0);
        });

        await mongoose.connect(mongoURI, options);

    } catch (error) {
        console.error('❌ Fatal MongoDB Connection Error:');
        console.error('   Message:', error.message);

        if (error.name === 'MongoServerSelectionError') {
            console.error('   Cause: Could not reach MongoDB. If using Atlas, check:');
            console.error('   1. IP Whitelist → set to 0.0.0.0/0 or your server IP');
            console.error('   2. MONGO_URI format is correct (mongodb+srv://...)');
            console.error('   3. Username/password are URL-encoded if they contain special chars');
        } else if (error.name === 'MongoParseError') {
            console.error('   Cause: Invalid connection string. Check MONGO_URI in .env');
        } else if (error.message.includes('Authentication failed')) {
            console.error('   Cause: Wrong username or password in MONGO_URI');
        }

        process.exit(1);
    }
};

module.exports = connectDB;
