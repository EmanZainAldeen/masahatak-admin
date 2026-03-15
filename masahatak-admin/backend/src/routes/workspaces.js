const express = require('express');
const router = express.Router();
const workspacesController = require('../controllers/workspacesController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', workspacesController.getAllWorkspaces);
router.get('/sub-admins', workspacesController.getSubAdmins);
router.get('/:id', workspacesController.getWorkspaceById);
router.post('/', workspacesController.createWorkspace);
router.put('/:id', workspacesController.updateWorkspace);
router.put('/:id/status', workspacesController.updateWorkspaceStatus);
router.delete('/:id', workspacesController.deleteWorkspace);

module.exports = router;
