const db = require('../config/database');

/**
 * 获取当前用户消息列表
 */
exports.getMessages = async (req, res) => {
    try {
        const { is_read, msg_type, page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        let sql = 'SELECT * FROM messages WHERE user_id = ?';
        const params = [req.user.id];

        if (is_read !== undefined) {
            sql += ' AND is_read = ?';
            params.push(parseInt(is_read));
        }
        if (msg_type) {
            sql += ' AND msg_type = ?';
            params.push(msg_type);
        }

        const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total;

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);

        const [rows] = await db.query(sql, params);

        res.json({
            code: 200,
            data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取消息列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 标记消息已读
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ code: 200, message: '已标记为已读' });
    } catch (error) {
        console.error('标记已读失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 全部标记已读
 */
exports.markAllAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE messages SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        res.json({ code: 200, message: '已全部标记为已读' });
    } catch (error) {
        console.error('全部标记已读失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取未读消息数量
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        res.json({ code: 200, data: { count: rows[0].count } });
    } catch (error) {
        console.error('获取未读数量失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 发送催办通知（销售→客户）
 */
exports.sendUrge = async (req, res) => {
    try {
        const { order_id, message } = req.body;

        const [order] = await db.query(
            `SELECT o.*, c.user_id as client_user_id, c.company_name
       FROM business_orders o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = ?`,
            [order_id]
        );

        if (order.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }

        if (!order[0].client_user_id) {
            return res.status(400).json({ code: 400, message: '该客户暂无登录账号，无法发送通知' });
        }

        await db.query(
            `INSERT INTO messages (user_id, title, content, msg_type, related_order_id)
       VALUES (?, '催办提醒', ?, 'urge', ?)`,
            [order[0].client_user_id, message || '销售提醒您尽快处理待办事项。', order_id]
        );

        res.json({ code: 200, message: '催办通知已发送' });
    } catch (error) {
        console.error('发送催办失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
