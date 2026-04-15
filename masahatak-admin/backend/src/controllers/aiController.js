const aiService = require('../services/aiService');

exports.chatWithConcierge = async (req, res) => {
  try {
    const { message, lang = 'en' } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({ error: 'lang must be ar or en' });
    }

    const response = await aiService.generateConciergeReply({
      message: message.trim(),
      lang,
    });

    return res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
};
