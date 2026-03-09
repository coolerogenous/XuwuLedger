const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 中间件
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// ============================================================
// 路由挂载
// ============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/messages', require('./routes/messages'));

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ code: 200, message: 'Xuwu Ledger Server is running', timestamp: new Date().toISOString() });
});

// ============================================================
// 错误处理
// ============================================================
app.use((err, req, res, next) => {
    console.error('未捕获错误:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ code: 413, message: '文件大小超过限制（最大50MB）' });
    }

    res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ code: 404, message: '接口不存在' });
});

// ============================================================
// 启动服务
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 Xuwu Ledger Server 已启动: http://localhost:${PORT}`);
    console.log(`📋 环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
