const db = require('../config/database');

// 订单状态流转规则
const STATUS_FLOW = {
    'draft': ['pending_material', 'ops_reviewing'],
    'pending_material': ['ops_reviewing'],
    'ops_reviewing': ['partner_confirming', 'rejected'],
    'partner_confirming': ['fund_recording', 'rejected'],
    'fund_recording': ['contract_signing'],
    'contract_signing': ['invoicing'],
    'invoicing': ['completed'],
    'rejected': ['draft']
};

/**
 * 生成订单编号: XW + 年月日 + 4位序号
 */
async function generateOrderNo() {
    const date = new Date();
    const prefix = 'XW' +
        date.getFullYear().toString().slice(-2) +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0');

    const [rows] = await db.query(
        "SELECT order_no FROM business_orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1",
        [prefix + '%']
    );

    let seq = 1;
    if (rows.length > 0) {
        seq = parseInt(rows[0].order_no.slice(-4)) + 1;
    }
    return prefix + String(seq).padStart(4, '0');
}

/**
 * 创建业务需求单
 */
exports.createOrder = async (req, res) => {
    try {
        const {
            client_id, product_name, pre_transaction_amount,
            service_fee_rate, retention_profit_rate, remark
        } = req.body;
        const sales_id = req.user.id;

        if (!client_id) {
            return res.status(400).json({ code: 400, message: '请选择客户' });
        }

        // 验证客户归属
        const [client] = await db.query('SELECT id, sales_id FROM clients WHERE id = ?', [client_id]);
        if (client.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        if (req.user.role === 'sales' && client[0].sales_id !== sales_id) {
            return res.status(403).json({ code: 403, message: '无权为该客户创建订单' });
        }

        const order_no = await generateOrderNo();

        // 计算金额
        const amount = parseFloat(pre_transaction_amount) || 0;
        const sfRate = parseFloat(service_fee_rate) || 0;
        const rpRate = parseFloat(retention_profit_rate) || 0;
        const service_fee = (amount * sfRate).toFixed(2);
        const retention_profit = (amount * rpRate).toFixed(2);
        const total_amount = amount;

        const [result] = await db.query(
            `INSERT INTO business_orders
       (order_no, client_id, sales_id, product_name, pre_transaction_amount,
        total_amount, service_fee_rate, service_fee, retention_profit_rate, retention_profit,
        status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
            [order_no, client_id, sales_id, product_name || '', amount,
                total_amount, sfRate, service_fee, rpRate, retention_profit, remark || '']
        );

        res.status(201).json({
            code: 201,
            message: '订单创建成功',
            data: { id: result.insertId, order_no }
        });
    } catch (error) {
        console.error('创建订单失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取业务单列表
 */
exports.getOrders = async (req, res) => {
    try {
        const { status, client_id, keyword, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = `
      SELECT o.*, c.company_name as client_name, u.real_name as sales_name
      FROM business_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.sales_id = u.id
      WHERE 1=1
    `;
        const params = [];

        // 角色数据隔离
        if (req.user.role === 'sales') {
            sql += ' AND o.sales_id = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'client') {
            sql += ' AND c.user_id = ?';
            params.push(req.user.id);
        }

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }
        if (client_id) {
            sql += ' AND o.client_id = ?';
            params.push(client_id);
        }
        if (keyword) {
            sql += ' AND (o.order_no LIKE ? OR o.product_name LIKE ? OR c.company_name LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        const countSql = sql.replace(/SELECT o\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取订单列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取订单详情（含关联资料、审核记录、资金记录）
 */
exports.getOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT o.*, c.company_name as client_name, c.contact_name, c.contact_phone,
              u.real_name as sales_name
       FROM business_orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.sales_id = u.id
       WHERE o.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }

        const order = rows[0];

        // 数据权限控制
        if (req.user.role === 'sales' && order.sales_id !== req.user.id) {
            return res.status(403).json({ code: 403, message: '无权查看该订单' });
        }

        // 获取关联数据
        const [materials] = await db.query(
            `SELECT m.*, u.real_name as uploader_name FROM order_materials m
       LEFT JOIN users u ON m.upload_by = u.id WHERE m.order_id = ?`,
            [id]
        );
        const [funds] = await db.query('SELECT * FROM fund_records WHERE order_id = ?', [id]);
        const [contracts] = await db.query('SELECT * FROM contracts WHERE order_id = ?', [id]);
        const [invoices] = await db.query('SELECT * FROM invoices WHERE order_id = ?', [id]);
        const [commissions] = await db.query(
            `SELECT sc.*, u.real_name as sales_name FROM sales_commissions sc
       LEFT JOIN users u ON sc.sales_id = u.id WHERE sc.order_id = ?`,
            [id]
        );

        res.json({
            code: 200,
            data: { ...order, materials, funds, contracts, invoices, commissions }
        });
    } catch (error) {
        console.error('获取订单详情失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 更新订单信息（草稿/驳回状态下可编辑）
 */
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            product_name, pre_transaction_amount,
            service_fee_rate, retention_profit_rate, remark
        } = req.body;

        const [existing] = await db.query('SELECT status, sales_id FROM business_orders WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }
        if (!['draft', 'rejected'].includes(existing[0].status)) {
            return res.status(400).json({ code: 400, message: '当前状态不允许编辑' });
        }

        const amount = parseFloat(pre_transaction_amount) || 0;
        const sfRate = parseFloat(service_fee_rate) || 0;
        const rpRate = parseFloat(retention_profit_rate) || 0;
        const service_fee = (amount * sfRate).toFixed(2);
        const retention_profit = (amount * rpRate).toFixed(2);

        await db.query(
            `UPDATE business_orders SET
       product_name = ?, pre_transaction_amount = ?, total_amount = ?,
       service_fee_rate = ?, service_fee = ?,
       retention_profit_rate = ?, retention_profit = ?,
       remark = ?, status = 'draft', reject_reason = NULL
       WHERE id = ?`,
            [product_name || '', amount, amount, sfRate, service_fee, rpRate, retention_profit, remark || '', id]
        );

        res.json({ code: 200, message: '订单更新成功' });
    } catch (error) {
        console.error('更新订单失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 提交订单给运营审核
 */
exports.submitOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query('SELECT status FROM business_orders WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }
        if (!['draft', 'rejected'].includes(existing[0].status)) {
            return res.status(400).json({ code: 400, message: '当前状态不允许提交' });
        }

        await db.query("UPDATE business_orders SET status = 'ops_reviewing' WHERE id = ?", [id]);

        // 发送通知给运营
        const [opsUsers] = await db.query("SELECT id FROM users WHERE role IN ('ops', 'admin') AND status = 1");
        for (const ops of opsUsers) {
            await db.query(
                `INSERT INTO messages (user_id, title, content, msg_type, related_order_id)
         VALUES (?, '新订单待审核', ?, 'review', ?)`,
                [ops.id, `销售 ${req.user.real_name} 提交了一个新订单，请尽快审核。`, id]
            );
        }

        res.json({ code: 200, message: '订单已提交审核' });
    } catch (error) {
        console.error('提交订单失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 审核订单（运营操作：通过/驳回）
 */
exports.reviewOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reject_reason } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ code: 400, message: '无效的审核操作' });
        }

        const [existing] = await db.query('SELECT status, sales_id FROM business_orders WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }
        if (existing[0].status !== 'ops_reviewing') {
            return res.status(400).json({ code: 400, message: '该订单不在审核状态' });
        }

        if (action === 'reject') {
            if (!reject_reason) {
                return res.status(400).json({ code: 400, message: '驳回时必须填写原因' });
            }
            await db.query(
                "UPDATE business_orders SET status = 'rejected', reject_reason = ? WHERE id = ?",
                [reject_reason, id]
            );

            // 通知销售
            await db.query(
                `INSERT INTO messages (user_id, title, content, msg_type, related_order_id)
         VALUES (?, '订单审核被驳回', ?, 'review', ?)`,
                [existing[0].sales_id, `您的订单已被驳回，原因：${reject_reason}。请修改后重新提交。`, id]
            );
        } else {
            await db.query(
                "UPDATE business_orders SET status = 'pending_material', reject_reason = NULL WHERE id = ?",
                [id]
            );

            // 通知销售
            await db.query(
                `INSERT INTO messages (user_id, title, content, msg_type, related_order_id)
         VALUES (?, '订单审核通过', ?, 'review', ?)`,
                [existing[0].sales_id, `您的订单已通过审核，请推进客户提交资料。`, id]
            );
        }

        res.json({ code: 200, message: action === 'approve' ? '审核通过' : '已驳回' });
    } catch (error) {
        console.error('审核订单失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 更新订单状态（通用状态流转）
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [existing] = await db.query('SELECT status FROM business_orders WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }

        const currentStatus = existing[0].status;
        const allowedNext = STATUS_FLOW[currentStatus] || [];
        if (!allowedNext.includes(status)) {
            return res.status(400).json({
                code: 400,
                message: `不允许从 "${currentStatus}" 流转到 "${status}"`
            });
        }

        await db.query('UPDATE business_orders SET status = ? WHERE id = ?', [status, id]);

        res.json({ code: 200, message: '状态更新成功' });
    } catch (error) {
        console.error('更新订单状态失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
