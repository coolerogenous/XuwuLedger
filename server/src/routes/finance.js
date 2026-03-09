const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(auth);

// 资金记录
router.post('/orders/:id/funds', requireRole('admin', 'ops', 'sales'), financeController.createFundRecord);

// 月度财务报表
router.get('/monthly-report', requireRole('admin', 'ops'), financeController.getMonthlyReport);

// 纳税估算
router.get('/tax-estimate', requireRole('admin', 'ops'), financeController.getTaxEstimate);

// 提成
router.get('/commissions', auth, financeController.getCommissions);
router.get('/commissions/:salesId', auth, financeController.getCommissions);
router.post('/commissions', requireRole('admin', 'ops'), financeController.createCommission);

module.exports = router;
