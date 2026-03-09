const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', messageController.getMessages);
router.get('/unread-count', messageController.getUnreadCount);
router.put('/read-all', messageController.markAllAsRead);
router.put('/:id/read', messageController.markAsRead);
router.post('/urge', messageController.sendUrge);

module.exports = router;
