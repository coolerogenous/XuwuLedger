const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);

// 待审核资料列表（运营）
router.get('/pending', requireRole('admin', 'ops'), materialController.getPendingMaterials);

// 审核资料
router.post('/:id/review', requireRole('admin', 'ops'), materialController.reviewMaterial);

// 删除资料
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;
