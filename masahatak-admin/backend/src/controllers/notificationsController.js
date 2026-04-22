const { db } = require('../config/firebase');
const { sendPushToUser } = require('../fcmService');

// Get notifications for admin
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const snapshot = await db.collection('notifications')
      .where('recipientType', '==', 'admin')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(offset)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalSnapshot = await db.collection('notifications')
      .where('recipientType', '==', 'admin')
      .get();

    const total = totalSnapshot.size;

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark notification as read
exports.readNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await db.collection('notifications').doc(notificationId).update({
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send notification to users
exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, title, and message are required',
      });
    }

    const notificationRef = await db.collection('notifications').add({
      userId,
      recipientType: 'user',
      title,
      message,
      type: type || 'general',
      isRead: false,
      createdAt: new Date()
    });

    res.json({
      success: true,
      notificationId: notificationRef.id,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send push notification to a specific user (admin action)
exports.sendPushNotification = async (req, res) => {
  try {
    const { uid, title, body, data } = req.body || {};

    if (!uid || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'uid, title, and body are required',
      });
    }

    const result = await sendPushToUser({
      uid,
      title,
      body,
      data: data || {},
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send push notification',
      message: error.message,
    });
  }
};

// List all notifications (admin view of all system notifications)
exports.listAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, recipientType, isRead } = req.query;
    const offset = (page - 1) * limit;

    let query = db.collection('notifications');

    if (recipientType) {
      query = query.where('recipientType', '==', recipientType);
    }

    if (isRead !== undefined) {
      query = query.where('isRead', '==', isRead === 'true');
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(offset)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List all notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await db.collection('notifications').doc(notificationId).delete();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
