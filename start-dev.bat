@echo off
rem ============================================================
rem  WHS 社区 - 一键启动（后端容器 + 前端 dev server）
rem  用法：双击本文件，或在命令行执行 start-dev.bat
rem  作用：
rem    1. 检查 Docker 引擎是否就绪
rem    2. 拉起后端容器（Storyden + Caddy），数据在 ./data
rem    3. 若 3000 端口没有前端，自动打开新窗口启动 npm run dev
rem  ⚠️ 如果 Docker Desktop 重启过（崩溃/更新/手动重启），
rem     容器可能不会自动恢复，请再运行一次本脚本。
rem ============================================================
setlocal
cd /d "%~dp0"

echo [1/3] 检查 Docker 引擎...
docker info >nul 2>&1
if errorlevel 1 (
    echo [!] Docker Desktop 未运行或未就绪，请先启动 Docker Desktop
    echo     并等右下角图标变绿后，再运行本脚本。
    pause
    exit /b 1
)
echo      OK - Docker 引擎就绪

echo [2/3] 启动后端容器（Storyden + Caddy）...
docker compose up -d
if errorlevel 1 (
    echo [!] 容器启动失败，请检查 Docker Desktop 状态
    pause
    exit /b 1
)
docker compose ps

echo [3/3] 检查前端 dev server（3000 端口）...
netstat -ano | findstr /c:":3000 " | findstr /c:"LISTENING" >nul
if errorlevel 1 (
    echo      前端未运行，正在新窗口启动 npm run dev ...
    start "WHS Frontend Dev" cmd /k "cd /d %~dp0 && npm run dev"
) else (
    echo      OK - 前端已在运行
)

echo.
echo ============================================================
echo  访问地址：
echo    前端（社区页面）   http://localhost:3000
echo    后端 API           http://localhost:8000
echo    Storyden 管理端   https://localhost   （浏览器需信任 caddy-local-ca.crt）
echo ============================================================
pause
