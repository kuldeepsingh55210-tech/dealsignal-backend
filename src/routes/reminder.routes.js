const express = require('express');
const router = express.Router();
const { createReminder, getReminders, deleteReminder, completeReminder } = require('../controllers/reminder.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', createReminder);
router.get('/', getReminders);
router.delete('/:id', deleteReminder);
router.patch('/:id/complete', completeReminder);

module.exports = router;