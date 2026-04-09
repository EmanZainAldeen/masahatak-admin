require('dotenv').config();

const express = require('express');
const cors = require('cors');

require('./firebaseAdmin');
const { sendPushToUser } = require('./fcmService');
const { startBookingSyncCron } = require('./bookingSyncCron');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/notifications/send', async (req, res) => {
  const { uid, title, body, data } = req.body || {};

  if (!uid || !title || !body) {
    return res.status(400).json({
      error: 'uid, title, and body are required',
    });
  }

  try {
    const result = await sendPushToUser({ uid, title, body, data: data || {} });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Failed to send notification:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      message: error.message,
    });
  }
});

startBookingSyncCron();

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
