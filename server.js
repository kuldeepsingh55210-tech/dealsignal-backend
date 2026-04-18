require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const leadRoutes = require('./src/routes/lead.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes');
const reminderRoutes = require('./src/routes/reminder.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const errorMiddleware = require('./src/middleware/error.middleware');

const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.endsWith('.railway.app') ||
            origin.endsWith('.narrowtech.in') ||
            origin === 'https://narrowtech.in') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.setHeader('ngrok-skip-browser-warning', 'true');
        next();
    });
}

app.use('/api/auth', authRoutes);
app.use('/api', webhookRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/reminders', reminderRoutes);
// ✅ Payment routes
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'DealSignal API Running', env: process.env.NODE_ENV || 'development' }));

app.use(errorMiddleware);

const startServer = async () => {
    try {
        await connectDB();
        require('./src/cron/automation');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
            console.log(`✅ Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    process.exit(1);
});