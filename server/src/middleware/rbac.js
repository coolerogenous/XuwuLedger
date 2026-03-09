/**
 * RBAC 角色权限中间件
 * 使用方式: requireRole('admin', 'ops')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ code: 401, message: '请先登录' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ code: 403, message: '权限不足，无法执行此操作' });
        }
        next();
    };
};

module.exports = { requireRole };
