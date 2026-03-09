const db = require('../config/database');

/**
 * Dashboard 统计数据 - 根据角色返回不同数据
 */
exports.getDashboard = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        let data = {};

        if (role === 'sales') {
            // 销售工作台
            const [newClients] = await db.query(
                'SELECT COUNT(*) as count FROM clients WHERE sales_id = ? AND created_at >= ? AND created_at < ?',
                [userId, startDate, endDate]
            );

            const [pendingMaterials] = await db.query(
                `SELECT COUNT(*) as count FROM business_orders
         WHERE sales_id = ? AND status = 'pending_material'`,
                [userId]
            );

            const [commission] = await db.query(
                `SELECT COALESCE(SUM(commission_amount), 0) as total
         FROM sales_commissions
         WHERE sales_id = ? AND created_at >= ? AND created_at < ?`,
                [userId, startDate, endDate]
            );

            const [myOrders] = await db.query(
                `SELECT status, COUNT(*) as count FROM business_orders
         WHERE sales_id = ? GROUP BY status`,
                [userId]
            );

            data = {
                new_clients_this_month: newClients[0].count,
                pending_material_orders: pendingMaterials[0].count,
                estimated_commission: commission[0].total,
                order_status_summary: myOrders
            };

        } else if (role === 'ops' || role === 'admin') {
            // 运营/管理员工作台
            const [pendingReview] = await db.query(
                "SELECT COUNT(*) as count FROM business_orders WHERE status = 'ops_reviewing'"
            );

            const [pendingMaterials] = await db.query(
                "SELECT COUNT(*) as count FROM order_materials WHERE status = 'pending'"
            );

            const [pendingContracts] = await db.query(
                "SELECT COUNT(*) as count FROM contracts WHERE status = 'pending'"
            );

            // 本月全局流水
            const [monthlyFlow] = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM fund_records
         WHERE record_date >= ? AND record_date < ?`,
                [startDate, endDate]
            );

            const [orderStats] = await db.query(
                'SELECT status, COUNT(*) as count FROM business_orders GROUP BY status'
            );

            data = {
                pending_review_orders: pendingReview[0].count,
                pending_materials: pendingMaterials[0].count,
                pending_contracts: pendingContracts[0].count,
                monthly_flow: monthlyFlow[0].total,
                order_status_summary: orderStats
            };

        } else if (role === 'client') {
            // 客户工作台
            const [pendingTasks] = await db.query(
                `SELECT COUNT(*) as count FROM business_orders o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE c.user_id = ? AND o.status IN ('pending_material', 'contract_signing')`,
                [userId]
            );

            const [myOrders] = await db.query(
                `SELECT o.id, o.order_no, o.product_name, o.status, o.created_at
         FROM business_orders o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE c.user_id = ?
         ORDER BY o.created_at DESC LIMIT 10`,
                [userId]
            );

            data = {
                pending_tasks: pendingTasks[0].count,
                recent_orders: myOrders
            };
        }

        // 未读消息数
        const [unread] = await db.query(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        data.unread_messages = unread[0].count;

        res.json({ code: 200, data });
    } catch (error) {
        console.error('获取 Dashboard 数据失败:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
};
