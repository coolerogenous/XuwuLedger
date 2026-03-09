# Xuwu Ledger - 业务流转与结算系统

旭吾内部业务流转与财务结算中枢系统，实现从需求到开票的全链路线上化管理。

## 技术栈

- **后端**: Node.js + Express + MySQL (mysql2)
- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **文件存储**: 本地存储 / 阿里云 OSS（可切换）

## 快速启动

### 1. 数据库初始化

```bash
mysql -u root -p < server/database/schema.sql
```

### 2. 后端启动

```bash
cd server
cp .env.example .env    # 编辑 .env 修改数据库配置
npm install
npm run dev             # http://localhost:3000
```

### 3. 前端启动

```bash
cd client
npm install
npm run dev             # http://localhost:5173
```

### 4. 默认管理员

- 用户名: `admin`
- 密码: `admin123`（请通过用户管理页面创建管理员后修改默认密码）

## 项目结构

```
XuwuLedger/
├── server/              # 后端 API
│   ├── src/
│   │   ├── app.js       # 入口
│   │   ├── config/      # 数据库配置
│   │   ├── middleware/   # 认证/RBAC中间件
│   │   ├── controllers/ # 业务逻辑
│   │   └── routes/      # 路由
│   └── database/
│       └── schema.sql   # 建表脚本
│
├── client/              # 前端 Vue 3
│   ├── src/
│   │   ├── api/         # Axios 封装
│   │   ├── stores/      # Pinia 状态
│   │   ├── router/      # 路由
│   │   └── views/       # 页面组件
│   └── vite.config.js
│
└── PRD.md               # 产品需求文档
```

## 角色说明

| 角色 | 权限 |
|------|------|
| 管理员 (admin) | 全局管理，用户管理 |
| 运营 (ops) | 审核、财务报表、合同发票 |
| 销售 (sales) | 客户管理、业务单、提成查看 |
| 客户 (client) | 查看订单、上传资料 |
| 链条方 (partner) | 确认业务 |
