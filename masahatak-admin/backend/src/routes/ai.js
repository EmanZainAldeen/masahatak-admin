const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// مسار الدردشة المستمرة
router.post('/chat', aiController.chatWithConcierge);

// مسار إنهاء الجلسة (يُستدعى عند الخروج من الشات أو الحجز)
router.post('/finalize', aiController.finalizeChatSession);

module.exports = router;
