@echo off
REM ==========================================
REM XuwuLedger 系统启动配置文件
REM 修改以下配置可以改变系统名称和其他设置
REM ==========================================

REM 系统名称
set SYSTEM_NAME=上海煌祁流转系统

REM 系统英文名称
set SYSTEM_NAME_EN=Shanghai HuangQi Ledger

REM 系统简名
set SYSTEM_ABBR=HQ Ledger

REM 系统描述
set SYSTEM_DESC=业务流转与结算中枢

REM 前端服务端口
set CLIENT_PORT=5173

REM 后端服务端口
set SERVER_PORT=3000

REM 前端地址
set CLIENT_URL=http://localhost:%CLIENT_PORT%

REM 后端地址
set SERVER_URL=http://localhost:%SERVER_PORT%

REM 数据库配置（如需要）
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=
set DB_NAME=xuwu_ledger
set DB_PORT=3306

REM 开发环境
set NODE_ENV=development

REM 已配置完成
