const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);

router.post('/', requireRole('admin', 'ops', 'sales'), clientController.createClient);
router.get('/', clientController.getClients);
router.get('/:id', clientController.getClient);
router.put('/:id', requireRole('admin', 'ops', 'sales'), clientController.updateClient);
router.post('/:id/account', requireRole('admin', 'ops', 'sales'), clientController.createClientAccount);

module.exports = router;
