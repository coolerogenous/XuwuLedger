-- ============================================================
-- Xuwu Ledger - 业务流转与结算系统 数据库 Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS xuwu_ledger DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE xuwu_ledger;

-- -----------------------------------------------------------
-- 1. 用户表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '登录用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    real_name VARCHAR(50) DEFAULT '' COMMENT '真实姓名',
    phone VARCHAR(20) DEFAULT '' COMMENT '手机号',
    role ENUM('admin', 'ops', 'sales', 'client', 'partner') NOT NULL DEFAULT 'client' COMMENT '角色',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1-启用 0-禁用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 默认管理员 (密码: admin123，bcrypt hash)
INSERT INTO users (username, password_hash, real_name, role)
VALUES ('admin', '$2b$10$Dgi.ELkeIGkbYiKK0hSqOeYmPdRudx3Uwh4F6jr7ceujS7MZtMwVG', '系统管理员', 'admin');

-- -----------------------------------------------------------
-- 2. 客户档案表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL COMMENT '企业名称',
    contact_name VARCHAR(50) DEFAULT '' COMMENT '联系人',
    contact_phone VARCHAR(20) DEFAULT '' COMMENT '联系电话',
    qualification TEXT COMMENT '资质信息',
    sales_id INT NOT NULL COMMENT '绑定销售ID',
    user_id INT DEFAULT NULL COMMENT '关联的用户账号ID（客户登录用）',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1-有效 0-无效',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户档案';

-- -----------------------------------------------------------
-- 3. 业务需求单（订单）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单编号',
    client_id INT NOT NULL COMMENT '客户ID',
    sales_id INT NOT NULL COMMENT '销售ID',
    product_name VARCHAR(200) DEFAULT '' COMMENT '客户下单产品',
    pre_transaction_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT '预刷流水值',
    total_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT '总流水金额',
    service_fee_rate DECIMAL(5,4) DEFAULT 0.0000 COMMENT '服务费比例(小数)',
    service_fee DECIMAL(15,2) DEFAULT 0.00 COMMENT '服务费金额',
    retention_profit_rate DECIMAL(5,4) DEFAULT 0.0000 COMMENT '留利比例(小数)',
    retention_profit DECIMAL(15,2) DEFAULT 0.00 COMMENT '留利金额',
    status ENUM(
        'draft',
        'pending_material',
        'ops_reviewing',
        'partner_confirming',
        'fund_recording',
        'contract_signing',
        'invoicing',
        'completed',
        'rejected'
    ) NOT NULL DEFAULT 'draft' COMMENT '业务状态',
    reject_reason TEXT COMMENT '驳回原因',
    remark TEXT COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (sales_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务需求单';

-- -----------------------------------------------------------
-- 4. 订单资料附件
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '关联订单ID',
    file_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_url VARCHAR(500) NOT NULL COMMENT '文件存储路径/URL',
    file_type VARCHAR(50) DEFAULT '' COMMENT '文件类型',
    file_size INT DEFAULT 0 COMMENT '文件大小(字节)',
    upload_by INT NOT NULL COMMENT '上传人ID',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id),
    FOREIGN KEY (upload_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单资料';

-- -----------------------------------------------------------
-- 5. 资料审核记录
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL COMMENT '资料ID',
    reviewer_id INT NOT NULL COMMENT '审核人ID',
    result ENUM('approved', 'rejected') NOT NULL COMMENT '审核结果',
    reject_reason TEXT COMMENT '驳回原因',
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES order_materials(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核记录';

-- -----------------------------------------------------------
-- 6. 链条方确认记录
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_confirmations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单ID',
    partner_id INT DEFAULT NULL COMMENT '链条方用户ID',
    company_a VARCHAR(200) DEFAULT '' COMMENT '公司A（买方）',
    company_b VARCHAR(200) DEFAULT '' COMMENT '公司B（卖方）',
    status ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending',
    remark TEXT,
    confirmed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id),
    FOREIGN KEY (partner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='链条方确认';

-- -----------------------------------------------------------
-- 7. 资金拆解与打款记录
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS fund_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单ID',
    record_type ENUM('service_fee', 'retention', 'payment_to_client', 'payment_to_partner') NOT NULL COMMENT '记录类型',
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '金额',
    direction ENUM('in', 'out') NOT NULL COMMENT 'in-入账 out-出账',
    account_type ENUM('corporate', 'personal') NOT NULL COMMENT '对公/对私',
    payer VARCHAR(200) DEFAULT '' COMMENT '付款方',
    payee VARCHAR(200) DEFAULT '' COMMENT '收款方',
    remark TEXT,
    record_date DATE DEFAULT NULL COMMENT '打款日期',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金记录';

-- -----------------------------------------------------------
-- 8. 销售提成记录
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单ID',
    sales_id INT NOT NULL COMMENT '销售ID',
    base_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '计算基数',
    commission_rate DECIMAL(5,4) DEFAULT 0.0000 COMMENT '提成比例',
    commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '提成金额',
    status ENUM('pending', 'confirmed', 'paid') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id),
    FOREIGN KEY (sales_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售提成';

-- -----------------------------------------------------------
-- 9. 合同管理
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单ID',
    contract_type ENUM('partner', 'client') NOT NULL COMMENT '合同类型：链条方/客户',
    contract_no VARCHAR(100) DEFAULT '' COMMENT '合同编号',
    title VARCHAR(200) DEFAULT '' COMMENT '合同标题',
    file_url VARCHAR(500) DEFAULT '' COMMENT '合同文件URL',
    status ENUM('pending', 'signed', 'archived') NOT NULL DEFAULT 'pending',
    signed_at DATETIME DEFAULT NULL,
    remark TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合同管理';

-- -----------------------------------------------------------
-- 10. 发票管理
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT '订单ID',
    invoice_type ENUM('input', 'output') NOT NULL COMMENT 'input-进项 output-销项',
    invoice_no VARCHAR(100) DEFAULT '' COMMENT '发票号码',
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '发票金额',
    tax_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT '税额',
    issuer VARCHAR(200) DEFAULT '' COMMENT '开票方',
    receiver VARCHAR(200) DEFAULT '' COMMENT '受票方',
    status ENUM('pending', 'issued', 'received', 'verified') NOT NULL DEFAULT 'pending',
    invoice_date DATE DEFAULT NULL,
    remark TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES business_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票管理';

-- -----------------------------------------------------------
-- 11. 站内消息
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '接收人ID',
    title VARCHAR(200) NOT NULL COMMENT '消息标题',
    content TEXT COMMENT '消息内容',
    msg_type ENUM('system', 'review', 'reminder', 'urge') NOT NULL DEFAULT 'system' COMMENT '消息类型',
    related_order_id INT DEFAULT NULL COMMENT '关联订单ID',
    is_read TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_order_id) REFERENCES business_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内消息';

-- -----------------------------------------------------------
-- 12. 操作日志
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '操作人ID',
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    target_table VARCHAR(50) DEFAULT '' COMMENT '目标表',
    target_id INT DEFAULT NULL COMMENT '目标记录ID',
    details TEXT COMMENT '操作详情(JSON)',
    ip_address VARCHAR(50) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志';
