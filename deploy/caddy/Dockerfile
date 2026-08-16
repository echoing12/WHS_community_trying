# ============================================================
#  带限流模块的 Caddy 镜像（登录/注册安全加固）
#  rate_limit 指令不在 Caddy 标准构建中，需编译 mholt/caddy-ratelimit 插件：
#  https://github.com/mholt/caddy-ratelimit
#  构建: docker compose build caddy  （或 docker compose up -d --build）
# ============================================================

FROM caddy:2-builder AS builder
# 国内网络: proxy.golang.org 被墙, 改用 goproxy.cn 镜像
# （checksum 校验也会经该代理转发, 无需额外配置 GOSUMDB）
ENV GOPROXY=https://goproxy.cn,direct
# ⚠️ 若以后需要更多 Caddy 插件，必须全部列在同一条 xcaddy build 里
#    （分开执行会互相覆盖）
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
