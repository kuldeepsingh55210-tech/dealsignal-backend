const express = require('express');
const { getLeads, getLeadStats } = require('../controllers/lead.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all lead routes
router.use(protect);

router.get('/', getLeads);
router.get('/stats', getLeadStats);

module.exports = router;
