const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const orderController = require('../controllers/orderController');
const materialController = require('../controllers/materialController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        // 允许常见文档和图片格式
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('不支持的文件类型'));
    }
});

router.use(auth);

// 业务单
router.post('/', requireRole('admin', 'ops', 'sales'), orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.put('/:id', requireRole('admin', 'ops', 'sales'), orderController.updateOrder);
router.post('/:id/submit', requireRole('admin', 'ops', 'sales'), orderController.submitOrder);
router.post('/:id/review', requireRole('admin', 'ops'), orderController.reviewOrder);
router.put('/:id/status', requireRole('admin', 'ops'), orderController.updateOrderStatus);

// 资料管理
router.post('/:id/materials', upload.single('file'), materialController.uploadMaterial);
router.get('/:id/materials', materialController.getMaterials);

module.exports = router;
