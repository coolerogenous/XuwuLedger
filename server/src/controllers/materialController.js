const db = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * 上传资料到订单
 */
exports.uploadMaterial = async (req, res) => {
    try {
        const { id: order_id } = req.params;

        if (!req.file) {
            return res.status(400).json({ code: 400, message: '请选择文件' });
        }

        // 验证订单存在且状态允许上传
        const [order] = await db.query('SELECT status, sales_id, client_id FROM business_orders WHERE id = ?', [order_id]);
        if (order.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }

        const file_url = `/uploads/${req.file.filename}`;

        const [result] = await db.query(
            `INSERT INTO order_materials (order_id, file_name, file_url, file_type, file_size, upload_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [order_id, req.file.originalname, file_url, req.file.mimetype, req.file.size, req.user.id]
        );

        res.status(201).json({
            code: 201,
            message: '文件上传成功',
            data: {
                id: result.insertId,
                file_name: req.file.originalname,
                file_url
            }
        });
    } catch (error) {
        console.error('上传资料失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取订单的资料列表
 */
exports.getMaterials = async (req, res) => {
    try {
        const { id: order_id } = req.params;

        const [rows] = await db.query(
            `SELECT m.*, u.real_name as uploader_name
       FROM order_materials m
       LEFT JOIN users u ON m.upload_by = u.id
       WHERE m.order_id = ?
       ORDER BY m.created_at DESC`,
            [order_id]
        );

        res.json({ code: 200, data: rows });
    } catch (error) {
        console.error('获取资料失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 审核资料（运营操作）
 */
exports.reviewMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { result: reviewResult, reject_reason } = req.body;

        if (!['approved', 'rejected'].includes(reviewResult)) {
            return res.status(400).json({ code: 400, message: '无效的审核结果' });
        }

        if (reviewResult === 'rejected' && !reject_reason) {
            return res.status(400).json({ code: 400, message: '驳回时必须填写原因' });
        }

        const [material] = await db.query(
            `SELECT m.*, o.sales_id FROM order_materials m
       LEFT JOIN business_orders o ON m.order_id = o.id
       WHERE m.id = ?`,
            [id]
        );
        if (material.length === 0) {
            return res.status(404).json({ code: 404, message: '资料不存在' });
        }

        // 更新资料状态
        await db.query('UPDATE order_materials SET status = ? WHERE id = ?', [reviewResult, id]);

        // 记录审核
        await db.query(
            `INSERT INTO material_reviews (material_id, reviewer_id, result, reject_reason)
       VALUES (?, ?, ?, ?)`,
            [id, req.user.id, reviewResult, reject_reason || null]
        );

        // 通知销售
        const title = reviewResult === 'approved' ? '资料审核通过' : '资料审核被驳回';
        const content = reviewResult === 'approved'
            ? `您提交的资料 "${material[0].file_name}" 已通过审核。`
            : `您提交的资料 "${material[0].file_name}" 被驳回，原因：${reject_reason}。`;

        await db.query(
            `INSERT INTO messages (user_id, title, content, msg_type, related_order_id)
       VALUES (?, ?, ?, 'review', ?)`,
            [material[0].sales_id, title, content, material[0].order_id]
        );

        res.json({ code: 200, message: reviewResult === 'approved' ? '审核通过' : '已驳回' });
    } catch (error) {
        console.error('审核资料失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 获取待审核资料列表（运营）
 */
exports.getPendingMaterials = async (req, res) => {
    try {
        const { page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;

        const countSql = `SELECT COUNT(*) as total FROM order_materials WHERE status = 'pending'`;
        const [countRows] = await db.query(countSql);
        const total = countRows[0].total;

        const [rows] = await db.query(
            `SELECT m.*, o.order_no, o.product_name, c.company_name as client_name,
              u.real_name as uploader_name
       FROM order_materials m
       LEFT JOIN business_orders o ON m.order_id = o.id
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN users u ON m.upload_by = u.id
       WHERE m.status = 'pending'
       ORDER BY m.created_at ASC
       LIMIT ? OFFSET ?`,
            [parseInt(pageSize), offset]
        );

        res.json({
            code: 200,
            data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取待审核列表失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};

/**
 * 删除资料
 */
exports.deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        const [material] = await db.query('SELECT * FROM order_materials WHERE id = ?', [id]);
        if (material.length === 0) {
            return res.status(404).json({ code: 404, message: '资料不存在' });
        }

        if (material[0].status === 'approved') {
            return res.status(400).json({ code: 400, message: '已审核通过的资料不允许删除' });
        }

        // 删除本地文件
        const filePath = path.join(process.cwd(), material[0].file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await db.query('DELETE FROM order_materials WHERE id = ?', [id]);

        res.json({ code: 200, message: '删除成功' });
    } catch (error) {
        console.error('删除资料失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
