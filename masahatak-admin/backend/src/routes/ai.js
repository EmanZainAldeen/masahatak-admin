const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// المسار الرئيسي للدردشة الذكية
router.post('/chat', aiController.chatWithConcierge);

// أبقيناه من النسخة الأكثر تطورًا لتحديث تفضيلات المستخدم بعد انتهاء المحادثة
router.post('/finalize', aiController.finalizeChatSession);

module.exports = router;
