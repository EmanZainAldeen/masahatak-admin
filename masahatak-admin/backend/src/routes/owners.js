const express = require('express');
const router = express.Router();
const ownersController = require('../controllers/ownersController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Owner profile routes
router.get('/:ownerId', ownersController.getOwnerProfile);
router.put('/:ownerId', ownersController.updateOwnerProfile);

// Owner spaces routes
router.post('/spaces', ownersController.createSpace);
router.get('/:ownerId/spaces', ownersController.listOwnerSpaces);
router.put('/spaces/:spaceId', ownersController.updateSpace);
router.delete('/spaces/:spaceId', ownersController.deleteSpace);

// Block dates routes
router.post('/spaces/:spaceId/blocks', ownersController.blockDates);
router.delete('/spaces/:spaceId/blocks/:blockId', ownersController.removeBlock);

// Owner bookings routes
router.get('/:ownerId/bookings', ownersController.listOwnerBookings);

// Owner assistants (sub_admins linked to this owner's spaces)
router.get('/:ownerId/assistants', ownersController.listOwnerAssistants);

module.exports = router;
