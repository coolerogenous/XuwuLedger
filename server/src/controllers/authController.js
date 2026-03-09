const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * 用户登录
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ code: 400, message: '请输入用户名和密码' });
        }

        const [rows] = await db.query(
            'SELECT id, username, password_hash, real_name, phone, role, status FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ code: 401, message: '用户名或密码错误' });
        }

        const user = rows[0];

        if (user.status === 0) {
            return res.status(403).json({ code: 403, message: '该账号已被禁用' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, real_name: user.real_name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            code: 200,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    real_name: user.real_name,
                    phone: user.phone,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 创建用户（管理员操作）
 */
exports.createUser = async (req, res) => {
    try {
        const { username, password, real_name, phone, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ code: 400, message: '用户名、密码和角色为必填项' });
        }

        const validRoles = ['admin', 'ops', 'sales', 'client', 'partner'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ code: 400, message: '无效的角色类型' });
        }

        // 检查用户名重复
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ code: 409, message: '用户名已存在' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, real_name, phone, role) VALUES (?, ?, ?, ?, ?)',
            [username, password_hash, real_name || '', phone || '', role]
        );

        res.status(201).json({
            code: 201,
            message: '创建用户成功',
            data: { id: result.insertId, username, real_name, role }
        });
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取当前登录用户信息
 */
exports.getMe = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, real_name, phone, role, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        res.json({ code: 200, data: rows[0] });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取用户列表（管理员/运营）
 */
exports.getUsers = async (req, res) => {
    try {
        const { role, status, keyword, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = 'SELECT id, username, real_name, phone, role, status, created_at FROM users WHERE 1=1';
        const params = [];

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }
        if (status !== undefined) {
            sql += ' AND status = ?';
            params.push(parseInt(status));
        }
        if (keyword) {
            sql += ' AND (username LIKE ? OR real_name LIKE ? OR phone LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        // 计算总数
        const countSql = sql.replace('SELECT id, username, real_name, phone, role, status, created_at', 'SELECT COUNT(*) as total');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: {
                list: rows,
                total,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            }
        });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 更新用户状态（启用/禁用）
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

        res.json({ code: 200, message: '更新成功' });
    } catch (error) {
        console.error('更新用户状态失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ code: 400, message: '请输入旧密码和新密码' });
        }

        const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '旧密码不正确' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

        res.json({ code: 200, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
