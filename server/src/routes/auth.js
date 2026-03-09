const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 公开路由
router.post('/login', authController.login);

// 需要认证的路由
router.get('/me', auth, authController.getMe);
router.put('/change-password', auth, authController.changePassword);

// 管理员路由
router.post('/users', auth, requireRole('admin'), authController.createUser);
router.get('/users', auth, requireRole('admin', 'ops'), authController.getUsers);
router.put('/users/:id/status', auth, requireRole('admin'), authController.updateUserStatus);

module.exports = router;
