const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
    getStats,
    getAllBrokers,
    getBrokerDetails,
    updateBrokerStatus,
    updateBrokerSubscription,
    getAllLeads
} = require('../controllers/admin.controller');

router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/brokers', getAllBrokers);
router.get('/brokers/:id', getBrokerDetails);
router.patch('/brokers/:id/status', updateBrokerStatus);
router.patch('/brokers/:id/subscription', updateBrokerSubscription);
router.get('/leads', getAllLeads);

module.exports = router;