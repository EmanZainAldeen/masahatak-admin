const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const usersRoutes = require('./users');
const workspacesRoutes = require('./workspaces');
const bookingsRoutes = require('./bookings');
const providersRoutes = require('./providers');
const reviewsRoutes = require('./reviews');
const analyticsRoutes = require('./analytics');
const paymentsRoutes = require('./payments');
const notificationsRoutes = require('./notifications');
const ownersRoutes = require('./owners');
const superadminRoutes = require('./superadmin');
const requestSpacesRoutes = require('./requestSpaces');

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/workspaces', workspacesRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/providers', providersRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/owners', ownersRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/request-spaces', requestSpacesRoutes);

module.exports = router;
