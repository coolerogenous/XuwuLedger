const db = require('../config/database');

/**
 * 创建客户档案
 */
exports.createClient = async (req, res) => {
    try {
        const { company_name, contact_name, contact_phone, qualification } = req.body;
        const sales_id = req.user.id;

        if (!company_name) {
            return res.status(400).json({ code: 400, message: '企业名称为必填项' });
        }

        const [result] = await db.query(
            'INSERT INTO clients (company_name, contact_name, contact_phone, qualification, sales_id) VALUES (?, ?, ?, ?, ?)',
            [company_name, contact_name || '', contact_phone || '', qualification || '', sales_id]
        );

        res.status(201).json({
            code: 201,
            message: '客户创建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建客户失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取客户列表
 * 销售只看自己的，运营/管理员看全部
 */
exports.getClients = async (req, res) => {
    try {
        const { keyword, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = `
      SELECT c.*, u.real_name as sales_name
      FROM clients c
      LEFT JOIN users u ON c.sales_id = u.id
      WHERE c.status = 1
    `;
        const params = [];

        // 销售只看自己的客户
        if (req.user.role === 'sales') {
            sql += ' AND c.sales_id = ?';
            params.push(req.user.id);
        }

        if (keyword) {
            sql += ' AND (c.company_name LIKE ? OR c.contact_name LIKE ? OR c.contact_phone LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        // 总数
        const countSql = sql.replace(/SELECT c\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取客户列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取客户详情
 */
exports.getClient = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT c.*, u.real_name as sales_name
       FROM clients c LEFT JOIN users u ON c.sales_id = u.id
       WHERE c.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }

        // 销售只能看自己的客户
        if (req.user.role === 'sales' && rows[0].sales_id !== req.user.id) {
            return res.status(403).json({ code: 403, message: '无权查看该客户' });
        }

        // 获取关联的业务单
        const [orders] = await db.query(
            'SELECT id, order_no, product_name, total_amount, status, created_at FROM business_orders WHERE client_id = ? ORDER BY created_at DESC',
            [id]
        );

        res.json({
            code: 200,
            data: { ...rows[0], orders }
        });
    } catch (error) {
        console.error('获取客户详情失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 更新客户信息
 */
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, contact_name, contact_phone, qualification } = req.body;

        // 检查权限
        const [existing] = await db.query('SELECT sales_id FROM clients WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        if (req.user.role === 'sales' && existing[0].sales_id !== req.user.id) {
            return res.status(403).json({ code: 403, message: '无权修改该客户' });
        }

        await db.query(
            'UPDATE clients SET company_name = ?, contact_name = ?, contact_phone = ?, qualification = ? WHERE id = ?',
            [company_name, contact_name || '', contact_phone || '', qualification || '', id]
        );

        res.json({ code: 200, message: '更新成功' });
    } catch (error) {
        console.error('更新客户失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 为客户创建登录账号
 */
exports.createClientAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password } = req.body;

        const [client] = await db.query('SELECT * FROM clients WHERE id = ?', [id]);
        if (client.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        if (client[0].user_id) {
            return res.status(409).json({ code: 409, message: '该客户已有登录账号' });
        }

        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 10);
        const [userResult] = await db.query(
            'INSERT INTO users (username, password_hash, real_name, phone, role) VALUES (?, ?, ?, ?, ?)',
            [username, password_hash, client[0].contact_name, client[0].contact_phone, 'client']
        );

        await db.query('UPDATE clients SET user_id = ? WHERE id = ?', [userResult.insertId, id]);

        res.status(201).json({
            code: 201,
            message: '客户账号创建成功',
            data: { userId: userResult.insertId, username }
        });
    } catch (error) {
        console.error('创建客户账号失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
