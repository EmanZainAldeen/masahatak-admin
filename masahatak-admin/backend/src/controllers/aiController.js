const aiService = require('../services/aiService');

// إرسال رسالة واستقبال رد ذكي
exports.chatWithConcierge = async (req, res) => {
  try {
    const {
      userId,
      message,
      lang,
      history = [],
      lastSpaces = [],
    } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // حل تعارض: بعض العملاء يرسلون lang صراحةً، لذلك ندعمه اختياريًا
    if (lang && !['ar', 'en'].includes(lang)) {
      return res.status(400).json({ error: 'lang must be ar or en' });
    }

    // حل تعارض: ميزات الذاكرة والتخصيص تعتمد على userId، لكن نبقيه اختياريًا للتوافق الخلفي
    const response = await aiService.generateConciergeReply({
      userId,
      message: message.trim(),
      lang,
      history,
      lastSpaces,
    });

    return res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
};

// إنهاء الجلسة وتحديث ملخص تفضيلات المستخدم
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
