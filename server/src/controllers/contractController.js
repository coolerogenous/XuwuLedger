const db = require('../config/database');

/**
 * 创建合同记录
 */
exports.createContract = async (req, res) => {
    try {
        const { id: order_id } = req.params;
        const { contract_type, contract_no, title, remark } = req.body;

        if (!contract_type) {
            return res.status(400).json({ code: 400, message: '请指定合同类型' });
        }

        let file_url = '';
        if (req.file) {
            file_url = `/uploads/${req.file.filename}`;
        }

        const [result] = await db.query(
            `INSERT INTO contracts (order_id, contract_type, contract_no, title, file_url, remark)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [order_id, contract_type, contract_no || '', title || '', file_url, remark || '']
        );

        res.status(201).json({
            code: 201,
            message: '合同创建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建合同失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 更新合同状态
 */
exports.updateContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remark } = req.body;

        const validStatus = ['pending', 'signed', 'archived'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ code: 400, message: '无效的合同状态' });
        }

        const updateFields = { status };
        if (status === 'signed') {
            updateFields.signed_at = new Date();
        }

        await db.query(
            'UPDATE contracts SET status = ?, signed_at = ?, remark = ? WHERE id = ?',
            [status, status === 'signed' ? new Date() : null, remark || '', id]
        );

        res.json({ code: 200, message: '合同状态更新成功' });
    } catch (error) {
        console.error('更新合同失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取合同列表
 */
exports.getContracts = async (req, res) => {
    try {
        const { status, contract_type, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = `
      SELECT ct.*, o.order_no, c.company_name as client_name
      FROM contracts ct
      LEFT JOIN business_orders o ON ct.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            sql += ' AND ct.status = ?';
            params.push(status);
        }
        if (contract_type) {
            sql += ' AND ct.contract_type = ?';
            params.push(contract_type);
        }

        const countSql = sql.replace(/SELECT ct\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        sql += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取合同列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

// ================== 发票管理 ==================

/**
 * 创建发票记录
 */
exports.createInvoice = async (req, res) => {
    try {
        const { id: order_id } = req.params;
        const { invoice_type, invoice_no, amount, tax_amount, issuer, receiver, invoice_date, remark } = req.body;

        if (!invoice_type || !amount) {
            return res.status(400).json({ code: 400, message: '请填写发票类型和金额' });
        }

        const [result] = await db.query(
            `INSERT INTO invoices
       (order_id, invoice_type, invoice_no, amount, tax_amount, issuer, receiver, invoice_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [order_id, invoice_type, invoice_no || '', amount, tax_amount || 0,
                issuer || '', receiver || '', invoice_date || null, remark || '']
        );

        res.status(201).json({
            code: 201,
            message: '发票记录创建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建发票失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 发票核对（发票金额 vs 对公入账金额）
 */
exports.getReconciliation = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = m === 12
            ? `${y + 1}-01-01`
            : `${y}-${String(m + 1).padStart(2, '0')}-01`;

        // 对公入账总额
        const [fundsIn] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'corporate' AND direction = 'in'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 销项发票总额
        const [invoicesOut] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM invoices
       WHERE invoice_type = 'output'
       AND invoice_date >= ? AND invoice_date < ?`,
            [startDate, endDate]
        );

        const difference = (fundsIn[0].total - invoicesOut[0].total).toFixed(2);

        res.json({
            code: 200,
            data: {
                year: y,
                month: m,
                corporate_income: fundsIn[0].total,
                output_invoice_total: invoicesOut[0].total,
                difference,
                is_balanced: Math.abs(parseFloat(difference)) < 0.01
            }
        });
    } catch (error) {
        console.error('发票核对失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
