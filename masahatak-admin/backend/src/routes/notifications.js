const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/me', notificationsController.getNotifications);
router.get('/all', notificationsController.listAllNotifications);
router.post('/:notificationId/read', notificationsController.readNotification);
router.post('/send', notificationsController.sendNotification);
router.post('/push', notificationsController.sendPushNotification);
router.delete('/:notificationId', notificationsController.deleteNotification);

module.exports = router;
