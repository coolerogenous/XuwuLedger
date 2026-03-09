const jwt = require('jsonwebtoken');

/**
 * JWT 认证中间件
 * 从 Authorization header 解析 Bearer Token，将用户信息注入 req.user
 */
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ code: 401, message: '未提供认证令牌' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 401, message: '令牌已过期，请重新登录' });
        }
        return res.status(401).json({ code: 401, message: '无效的认证令牌' });
    }
};

module.exports = auth;
