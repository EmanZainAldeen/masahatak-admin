const express = require('express');
const router = express.Router();
const controller = require('../controllers/requestSpaceController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', controller.getAllRequests);
router.get('/:id', controller.getRequestById);
router.put('/:id/status', controller.updateRequestStatus);
router.post('/:id/approve', controller.approveRequest);
router.delete('/:id', controller.deleteRequest);

module.exports = router;
