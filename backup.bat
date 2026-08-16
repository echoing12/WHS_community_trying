@echo off
rem ============================================================
rem  WHS 社区 - 本机一键备份（Windows）
rem  备份内容：data/（数据库 + 上传图片）+ .env + Caddyfile + docker-compose.yml
rem  用法：双击运行，或命令行执行 backup.bat
rem  备份文件输出到 backups\ 目录（已加入 .gitignore）
rem ============================================================
setlocal

set BACKUP_DIR=backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set TARGET=%BACKUP_DIR%\backup_%TIMESTAMP%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%TARGET%" mkdir "%TARGET%"

echo [1/4] 停止 Storyden 容器（保证数据库文件一致）...
docker compose stop storyden
if errorlevel 1 (
    echo [!] 停止容器失败，请确认 Docker Desktop 正在运行
    pause
    exit /b 1
)

echo [2/4] 复制数据目录...
robocopy data "%TARGET%\data" /E /NFL /NDL /NJH /NJS
if errorlevel 8 (
    echo [!] 复制数据失败
    docker compose start storyden
    pause
    exit /b 1
)

echo [3/4] 复制配置文件...
copy /Y .env "%TARGET%\env.txt" >nul
copy /Y Caddyfile "%TARGET%\Caddyfile" >nul
copy /Y docker-compose.yml "%TARGET%\docker-compose.yml" >nul

echo [4/4] 恢复 Storyden 容器...
docker compose start storyden

echo.
echo 备份完成：%TARGET%
echo 请把该目录复制到安全的地方（U盘 / 网盘 / 另一台机器）。
pause
