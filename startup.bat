@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 引入配置文件
call "%cd%\config.bat"

::==========================================
:: XuwuLedger 一键启动脚本
::==========================================

echo.
echo ██╗  ██╗██╗   ██╗██╗    ██╗██╗   ██╗
echo ╚██╗██╔╝██║   ██║██║    ██║██║   ██║
echo  ╚███╔╝ ██║   ██║██║ █╗ ██║██║   ██║
echo  ██╔██╗ ██║   ██║██║███╗██║██║   ██║
echo ██╔╝ ██╗╚██████╔╝╚███╔███╔╝╚██████╔╝
echo ╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝  ╚═════╝
echo.
echo        !SYSTEM_NAME! 启动中...
echo.

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 请访问 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)

echo [✓] Node.js 已安装
echo.

:: 进入服务器目录并启动
echo [启动] 后端服务器...
start "!SYSTEM_NAME! - 后端服务器" cmd /k "cd /d "%cd%\server" && (if not exist node_modules (echo [安装] 正在安装后端依赖... && npm install) else (echo [✓] 后端依赖已存在)) && echo. && echo [启动] 后端服务运行在: !SERVER_URL! && echo. && npm run dev"

:: 等待 3 秒
timeout /t 3 /nobreak

:: 启动前端
echo [启动] 前端开发服务器...
start "!SYSTEM_NAME! - 前端应用" cmd /k "cd /d "%cd%\client" && (if not exist node_modules (echo [安装] 正在安装前端依赖... && npm install) else (echo [✓] 前端依赖已存在)) && echo. && echo [启动] 前端应用运行在: !CLIENT_URL! && echo. && npm run dev"

echo.
echo ✓ 启动完成！
echo.
echo 应用信息:
echo   - 系统名称: !SYSTEM_NAME!
echo   - 系统标语: !SYSTEM_DESC!
echo   - 前端地址: !CLIENT_URL!
echo   - 后端地址: !SERVER_URL!
echo   - API代理: /api/* ^-> !SERVER_URL!
echo.
echo 提示:
echo   - 请在两个弹出的命令窗口中查看详细信息
echo   - 首次启动会自动安装依赖，请耐心等待
echo   - 按 Ctrl+C 可以停止服务
echo.

pause
