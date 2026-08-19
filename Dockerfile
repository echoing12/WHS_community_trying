# ============================================================
#  WHS 社区前端镜像（Next.js 14 生产模式）
#
#  构建: docker compose -f docker-compose.prod.yml up -d --build frontend
#
#  ⚠️ 注意: 不要在任何构建阶段设置 NEXT_PUBLIC_* 变量!
#     NEXT_PUBLIC_* 会在构建时被内联进 JS 代码, 一旦写死绝对地址,
#     浏览器就会跨域请求后端并被 CORS 拦截(表现为「加载失败」)。
#     前端一律使用相对路径 /api/*, 由 Caddy/Nginx 反代到 Storyden。
# ============================================================

# ---- 依赖安装层 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 构建层 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行层 ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]
