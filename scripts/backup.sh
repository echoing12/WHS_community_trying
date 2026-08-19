#!/usr/bin/env bash
# ============================================================
#  WHS 社区 - 服务器一键备份（Linux）
#  备份内容：data/（数据库 + 上传图片）+ .env + Caddyfile* + docker-compose*
#  用法：chmod +x scripts/backup.sh && ./scripts/backup.sh
#  自动识别生产 compose（docker-compose.prod.yml 优先，否则用 docker-compose.yml）
#  配合 cron 自动备份（示例：每天凌晨 3:30 备份）：
#    crontab -e 添加一行：
#    30 3 * * * /opt/whs_community/scripts/backup.sh >> /var/log/whs-backup.log 2>&1
#  注意：请把备份目录挂载/同步到其他机器或对象存储，防服务器损坏。
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M)"
TARGET="${BACKUP_ROOT}/backup_${TIMESTAMP}"

# 生产环境用 prod compose（含 frontend），否则用开发版
COMPOSE_FILE="docker-compose.yml"
[ -f docker-compose.prod.yml ] && COMPOSE_FILE="docker-compose.prod.yml"

mkdir -p "${TARGET}"

echo "[1/4] 停止 Storyden 容器（保证数据库文件一致）..."
docker compose -f "${COMPOSE_FILE}" stop storyden

echo "[2/4] 复制数据目录..."
cp -a data "${TARGET}/data"

echo "[3/4] 复制配置文件..."
cp .env "${TARGET}/env.txt"
cp Caddyfile "${TARGET}/Caddyfile" 2>/dev/null || true
cp Caddyfile.production "${TARGET}/Caddyfile.production" 2>/dev/null || true
cp docker-compose.yml "${TARGET}/docker-compose.yml" 2>/dev/null || true
cp docker-compose.prod.yml "${TARGET}/docker-compose.prod.yml" 2>/dev/null || true

echo "[4/4] 恢复 Storyden 容器..."
docker compose -f "${COMPOSE_FILE}" start storyden

# 保留最近 14 份备份，更早的自动清理（防磁盘被备份占满）
find "${BACKUP_ROOT}" -maxdepth 1 -type d -name 'backup_*' | sort | head -n -14 | xargs -r rm -rf

echo "备份完成：${TARGET}"
