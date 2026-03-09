const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const contractController = require('../controllers/contractController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'contract-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.use(auth);

// 合同
router.post('/orders/:id/contracts', requireRole('admin', 'ops'), upload.single('file'), contractController.createContract);
router.get('/', contractController.getContracts);
router.put('/:id', requireRole('admin', 'ops'), contractController.updateContract);

// 发票
router.post('/orders/:id/invoices', requireRole('admin', 'ops'), contractController.createInvoice);
router.get('/reconciliation', requireRole('admin', 'ops'), contractController.getReconciliation);

module.exports = router;
