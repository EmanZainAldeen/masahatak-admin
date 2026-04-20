const aiService = require('../services/aiService');

// 1. إرسال رسالة واستقبال رد ذكي
exports.chatWithConcierge = async (req, res) => {
  try {
    const { userId, message, history = [], lastSpaces = [] } = req.body || {};

    // التحقق من البيانات الأساسية
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!message) return res.status(400).json({ error: 'message is required' });

    // استدعاء السيرفس المحدث
    const response = await aiService.generateConciergeReply({
      userId,
      message: message.trim(),
      history,      // مصفوفة الهيستوري القادمة من الموبايل
      lastSpaces    // آخر 10 مساحات كانت معروضة للمقارنة
    });

    return res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
};

// 2. إنهاء الجلسة وتحديث ملخص تفضيلات المستخدم
exports.finalizeChatSession = async (req, res) => {
  try {
    const { userId, history = [] } = req.body || {};

    if (!userId || history.length === 0) {
      return res.status(400).json({ error: 'userId and history are required to finalize' });
    }

    await aiService.finalizeUserSession({ userId, history });

    return res.json({ success: true, message: 'User preferences profile updated.' });
  } catch (error) {
    console.error('Finalize session error:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
};
