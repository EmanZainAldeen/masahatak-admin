const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

<<<<<<< HEAD
// مسار الدردشة المستمرة
router.post('/chat', aiController.chatWithConcierge);

// مسار إنهاء الجلسة (يُستدعى عند الخروج من الشات أو الحجز)
router.post('/finalize', aiController.finalizeChatSession);

=======
router.post('/chat', aiController.chatWithConcierge);

>>>>>>> 177c929 (Add Flutter AI chat integration guide as flutter_ai.md)
module.exports = router;
