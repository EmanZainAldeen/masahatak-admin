require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { admin, db } = require('./firebaseAdmin');
const { sendPushToUser } = require('./fcmService');
const { startBookingSyncCron, sendBookingNotification } = require('./bookingSyncCron');

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


app.post('/send-booking-notification', async (req, res) => {
  const {
    bookingId,
    userId,
    userIds,
    title,
    body,
    eventType = 'tip',
    booking = {},
  } = req.body || {};

  if (!bookingId || !title || !body) {
    return res.status(400).json({
      error: 'bookingId, title, and body are required',
    });
  }

  const targetUserIds = [...new Set([
    ...(Array.isArray(userIds) ? userIds : []),
    userId,
  ].filter(Boolean))];

  if (!targetUserIds.length) {
    return res.status(400).json({
      error: 'userId or userIds is required',
    });
  }

  try {
    const result = await sendBookingNotification({
      booking: { ...booking, status: booking?.status || 'confirmed' },
      bookingId,
      userIds: targetUserIds,
      eventType,
      title,
      body,
      deps: { admin, db, sendPushToUser, logger: console },
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to send booking notification:', error);
    return res.status(500).json({
      error: 'Failed to send booking notification',
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
