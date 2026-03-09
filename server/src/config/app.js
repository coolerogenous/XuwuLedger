/**
 * 后端系统配置文件
 * 在此修改系统名称、端口等配置
 */

const APP_CONFIG = {
  // 系统名称
  systemName: '上海煌祁流转系统',

  // 系统英文名称
  systemEnglishName: 'Shanghai HuangQi Ledger',

  // 系统简写
  systemAbbr: 'HQ Ledger',

  // 系统描述/标语
  systemDescription: '业务流转与结算中枢',

  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // 前端配置（用于 CORS 等）
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173'
  },

  // JWT 密钥
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  },

  // 上传文件配置
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // 数据库配置（根据 config/database.js 的结构）
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xuwu_ledger',
    port: process.env.DB_PORT || 3306
  },

  // 应用版本
  version: '1.0.0',

  // 开发者信息
  developer: 'Xuwu Team',

  // 公司信息
  company: {
    name: '上海煌祁',
    fullName: '上海煌祁有限公司',
    website: 'https://example.com'
  }
}

module.exports = APP_CONFIG
