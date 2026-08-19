#!/usr/bin/env bash
# ============================================================
#  WHS 社区云服务器一键修复脚本（统一入口方案）
#
#  用法:  bash deploy-fix.sh [站点地址]
#    站点地址默认 42.193.101.174，可传域名或其它 IP 覆盖
#
#  作用（全自动）:
#    1. 备份 Caddyfile / docker-compose.yml / .env
#    2. 检查 Dockerfile / compose 是否残留 NEXT_PUBLIC（会内联进代码，必须先删）
#    3. 重写 Caddyfile: 前端 + API 统一反代（同源，消除 CORS）
#    4. 修改 docker-compose.yml: 去掉 NEXT_PUBLIC_API_URL、去掉 storyden 的 8001 公网映射
#    5. 修改 .env: PUBLIC_WEB_ADDRESS / PUBLIC_API_ADDRESS 指向站点地址
#    6. 重建前端镜像（NEXT_PUBLIC_* 是构建时内联的，必须重建）
#    7. 应用 .env 到 storyden，校验并重启 Caddy
#    8. 验证 80 端口页面与 API
# ============================================================
set -euo pipefail

SITE_IP="${1:-42.193.101.174}"
cd "$(dirname "$0")"

echo "==> [0/6] 目标站点: http://$SITE_IP"

# ---------- 1. 备份 ----------
BK="backups/deploy-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"
cp Caddyfile docker-compose.yml .env "$BK/" 2>/dev/null || true
echo "==> [1/6] 已备份到 $BK"

# ---------- 2. 检查 Dockerfile 是否残留 NEXT_PUBLIC（构建期内联） ----------
if grep -n "NEXT_PUBLIC" Dockerfile 2>/dev/null; then
  echo
  echo "⚠️  上面列出的 Dockerfile 里有 NEXT_PUBLIC 引用。NEXT_PUBLIC_* 会在构建时被内联进前端代码，"
  echo "    必须先删掉 Dockerfile 里相关行再运行本脚本。"
  echo "    不确定怎么删就把上面的输出贴给 AI。"
  exit 1
fi
echo "==> [2/6] Dockerfile 无 NEXT_PUBLIC 残留 ✓"

# ---------- 3. 重写 Caddyfile（统一入口） ----------
cat > Caddyfile <<EOF
$SITE_IP {
	route {
		# 登录/注册限流（保留，防暴力破解）
		rate_limit /api/auth/password/signin {
			zone signin {
				key {http.request.remote.host}
				window 1m
				events 10
			}
		}
		rate_limit /api/auth/password/signup {
			zone signup {
				key {http.request.remote.host}
				window 1m
				events 5
			}
		}
		# API → Storyden 容器（compose 网络内按服务名访问）
		reverse_proxy /api/* storyden:8000
		# 页面/静态资源 → 前端容器
		reverse_proxy frontend:3000
	}
}
EOF
echo "==> [3/6] Caddyfile 已更新（站点: $SITE_IP）"

# ---------- 4. 修改 docker-compose.yml 与 .env ----------
command -v python3 >/dev/null 2>&1 || {
  echo "缺少 python3，请先执行: sudo apt-get update && sudo apt-get install -y python3"
  exit 1
}
python3 - "$SITE_IP" <<'PY'
import re, sys
site = sys.argv[1]

# 1) docker-compose.yml: 去掉 NEXT_PUBLIC_API_URL 行、去掉 storyden 的 8001 端口映射
p = 'docker-compose.yml'
s = open(p, encoding='utf-8').read()
s = s.replace('\r\n', '\n')
orig = s
s = re.sub(r'^[ \t]*NEXT_PUBLIC_API_URL:[^\n]*\n', '', s, flags=re.M)
s = re.sub(r'^([ \t]*)ports:[ \t]*\n[ \t]*- "8001:8000"[ \t]*\n', '', s, flags=re.M)
changed = s != orig
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('compose: 已移除 NEXT_PUBLIC_API_URL 与 storyden 的 8001 映射' if changed
      else 'compose: 无需修改（可能已处理过）')

# 2) .env: PUBLIC_WEB_ADDRESS / PUBLIC_API_ADDRESS 指向 http://<站点>
p = '.env'
s = open(p, encoding='utf-8').read()
s = s.replace('\r\n', '\n')
def set_line(text, key, val):
    pat = re.compile(r'^' + re.escape(key) + r'=.*$', re.M)
    if pat.search(text):
        return pat.sub(key + '=' + val, text)
    return text.rstrip('\n') + '\n' + key + '=' + val + '\n'
s = set_line(s, 'PUBLIC_WEB_ADDRESS', 'http://' + site)
s = set_line(s, 'PUBLIC_API_ADDRESS', 'http://' + site)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('.env: PUBLIC_WEB_ADDRESS / PUBLIC_API_ADDRESS 已指向 http://' + site)
PY
echo "==> [4/6] docker-compose.yml 与 .env 已修改"

# 补丁后再查一遍：compose 里若还有 NEXT_PUBLIC（例如写在 build.args 里），构建仍会内联
if grep -n "NEXT_PUBLIC" docker-compose.yml 2>/dev/null; then
  echo
  echo "⚠️  docker-compose.yml 里仍有 NEXT_PUBLIC 引用（上面列出，可能在 build.args 里），"
  echo "    请把它贴给 AI 协助删除后再运行本脚本。"
  exit 1
fi
echo "==> compose 无 NEXT_PUBLIC 残留 ✓"

# ---------- 5. 重建 / 重启 ----------
echo "==> [5/6] 重建前端镜像（必须：变量是构建时内联的）"
docker compose up -d --build frontend

echo "==> 应用新的 .env 到 storyden"
docker compose up -d storyden

echo "==> 校验并重启 Caddy"
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy

# ---------- 6. 验证 ----------
echo
echo "==> [6/6] 验证（走 80 端口，同源）"
sleep 3
curl -s -o /dev/null -w "页面  : %{http_code}\n" "http://$SITE_IP/" || true
curl -s -o /dev/null -w "API   : %{http_code}\n" "http://$SITE_IP/api/threads" || true
echo "--- API 返回内容（前 200 字符）---"
curl -s "http://$SITE_IP/api/threads" | head -c 200 || true
echo
echo
echo "完成！浏览器访问 http://$SITE_IP （不带端口）"
echo "提醒: 请到云控制台安全组放行 80，并关闭 8001 / 3000 的公网访问。"
