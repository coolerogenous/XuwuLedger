const db = require('../config/database');

/**
 * 录入资金拆解记录
 */
exports.createFundRecord = async (req, res) => {
    try {
        const { id: order_id } = req.params;
        const { record_type, amount, direction, account_type, payer, payee, remark, record_date } = req.body;

        if (!record_type || !amount || !direction || !account_type) {
            return res.status(400).json({ code: 400, message: '请填写完整的资金记录信息' });
        }

        const [result] = await db.query(
            `INSERT INTO fund_records
       (order_id, record_type, amount, direction, account_type, payer, payee, remark, record_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [order_id, record_type, amount, direction, account_type,
                payer || '', payee || '', remark || '', record_date || null, req.user.id]
        );

        res.status(201).json({
            code: 201,
            message: '资金记录创建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建资金记录失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取月度财务报表
 */
exports.getMonthlyReport = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = m === 12
            ? `${y + 1}-01-01`
            : `${y}-${String(m + 1).padStart(2, '0')}-01`;

        // 对公总入账（服务费）
        const [corporateIn] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'corporate' AND direction = 'in'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 对私总入账（留利）
        const [personalIn] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'personal' AND direction = 'in'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 对公总出账
        const [corporateOut] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'corporate' AND direction = 'out'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 对私总出账
        const [personalOut] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'personal' AND direction = 'out'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 当月完成的订单数
        const [orderCount] = await db.query(
            `SELECT COUNT(*) as total FROM business_orders
       WHERE updated_at >= ? AND updated_at < ? AND status = 'completed'`,
            [startDate, endDate]
        );

        // 当月开票总额（销项）
        const [invoiceOut] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM invoices
       WHERE invoice_type = 'output' AND invoice_date >= ? AND invoice_date < ?`,
            [startDate, endDate]
        );

        // 当月进项总额
        const [invoiceIn] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM invoices
       WHERE invoice_type = 'input' AND invoice_date >= ? AND invoice_date < ?`,
            [startDate, endDate]
        );

        // 资金明细流水
        const [details] = await db.query(
            `SELECT f.*, o.order_no, c.company_name as client_name
       FROM fund_records f
       LEFT JOIN business_orders o ON f.order_id = o.id
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE f.record_date >= ? AND f.record_date < ?
       ORDER BY f.record_date DESC`,
            [startDate, endDate]
        );

        res.json({
            code: 200,
            data: {
                year: y,
                month: m,
                summary: {
                    corporate_in: corporateIn[0].total,
                    personal_in: personalIn[0].total,
                    corporate_out: corporateOut[0].total,
                    personal_out: personalOut[0].total,
                    completed_orders: orderCount[0].total,
                    invoice_output: invoiceOut[0].total,
                    invoice_input: invoiceIn[0].total
                },
                details
            }
        });
    } catch (error) {
        console.error('获取月度报表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 纳税基数估算
 */
exports.getTaxEstimate = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = m === 12
            ? `${y + 1}-01-01`
            : `${y}-${String(m + 1).padStart(2, '0')}-01`;

        // 对公入账总额
        const [corporateIn] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM fund_records
       WHERE account_type = 'corporate' AND direction = 'in'
       AND record_date >= ? AND record_date < ?`,
            [startDate, endDate]
        );

        // 销项发票总额
        const [invoiceOutput] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tax_amount), 0) as tax_total
       FROM invoices
       WHERE invoice_type = 'output' AND invoice_date >= ? AND invoice_date < ?`,
            [startDate, endDate]
        );

        // 进项发票总额
        const [invoiceInput] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(tax_amount), 0) as tax_total
       FROM invoices
       WHERE invoice_type = 'input' AND invoice_date >= ? AND invoice_date < ?`,
            [startDate, endDate]
        );

        res.json({
            code: 200,
            data: {
                year: y,
                month: m,
                corporate_income: corporateIn[0].total,
                output_invoice_amount: invoiceOutput[0].total,
                output_tax: invoiceOutput[0].tax_total,
                input_invoice_amount: invoiceInput[0].total,
                input_tax: invoiceInput[0].tax_total,
                tax_base: (corporateIn[0].total - invoiceInput[0].total).toFixed(2),
                vat_payable: (invoiceOutput[0].tax_total - invoiceInput[0].tax_total).toFixed(2)
            }
        });
    } catch (error) {
        console.error('获取纳税估算失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取销售提成明细
 */
exports.getCommissions = async (req, res) => {
    try {
        const salesId = req.params.salesId || req.user.id;

        // 销售只能看自己的
        if (req.user.role === 'sales' && parseInt(salesId) !== req.user.id) {
            return res.status(403).json({ code: 403, message: '无权查看他人提成' });
        }

        const { year, month, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = `
      SELECT sc.*, o.order_no, o.product_name, o.total_amount,
             c.company_name as client_name
      FROM sales_commissions sc
      LEFT JOIN business_orders o ON sc.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE sc.sales_id = ?
    `;
        const params = [salesId];

        if (year && month) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = parseInt(month) === 12
                ? `${parseInt(year) + 1}-01-01`
                : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
            sql += ' AND sc.created_at >= ? AND sc.created_at < ?';
            params.push(startDate, endDate);
        }

        const countSql = sql.replace(/SELECT sc\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        // 合计
        const sumSql = sql.replace(/SELECT sc\.\*.*FROM/, 'SELECT COALESCE(SUM(sc.commission_amount), 0) as total_commission FROM');
        const [sumRows] = await db.query(sumSql, params);

        sql += ' ORDER BY sc.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: {
                list: rows,
                total,
                total_commission: sumRows[0].total_commission,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            }
        });
    } catch (error) {
        console.error('获取提成明细失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 录入/更新销售提成
 */
exports.createCommission = async (req, res) => {
    try {
        const { order_id, sales_id, base_amount, commission_rate } = req.body;

        if (!order_id || !sales_id || !base_amount || !commission_rate) {
            return res.status(400).json({ code: 400, message: '请填写完整的提成信息' });
        }

        const commission_amount = (parseFloat(base_amount) * parseFloat(commission_rate)).toFixed(2);

        const [result] = await db.query(
            `INSERT INTO sales_commissions (order_id, sales_id, base_amount, commission_rate, commission_amount)
       VALUES (?, ?, ?, ?, ?)`,
            [order_id, sales_id, base_amount, commission_rate, commission_amount]
        );

        res.status(201).json({
            code: 201,
            message: '提成记录创建成功',
            data: { id: result.insertId, commission_amount }
        });
    } catch (error) {
        console.error('创建提成记录失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
