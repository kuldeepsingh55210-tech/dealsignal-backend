const express = require('express');
const { getLeads, getLeadStats, updateLead } = require('../controllers/lead.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getLeads);
router.get('/stats', getLeadStats);
router.patch('/:id', updateLead);

module.exports = router;