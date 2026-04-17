const express = require('express');
const { getLeads, getLeadStats, updateLead } = require('../controllers/leads.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getLeads);
router.get('/stats', getLeadStats);

// ✅ Lead status + notes update
router.patch('/:id', updateLead);

module.exports = router;