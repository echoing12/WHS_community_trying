// ============================================================
//  API 代理配置（生产环境兼容）
// ============================================================
// 开发环境：浏览器发出的 /api/* 请求，由 Next.js 服务端代理到本地后端
// （StoryDen 容器直接映射在 http://localhost:8000）
//
// ⚠️ 为什么直连容器而不是走 Caddy（http://localhost）：
//   Caddy 会把 http://localhost 308 跳转到 https://localhost：
//   1) Next 的 rewrites 会把 308 原样返回给浏览器，浏览器跟随到 https://localhost
//      —— 跨源请求，而 StoryDen 后端不返回 Access-Control-Allow-Origin 头，
//      所有 API 请求都会被浏览器 CORS 拦截（表现为「加载失败 / 无法登录」）
//   2) https 需要 NODE_EXTRA_CA_CERTS 信任本地自签证书，容易遗漏
//   直连 http://localhost:8000 是纯 HTTP 同源代理，无上述任何问题。
//   生产环境由 Nginx 反向代理 /api/*，与此无关。
//
// 生产环境：rewrites 仅在开发环境生效（NODE_ENV=development）。
// next build / next start 构建生产包时自动跳过 rewrites，
// 由 Nginx 反向代理 /api/* 到 StoryDen 后端（见 deploy/nginx.conf.example）。
//
// 前端代码中请求路径始终是相对路径（如 /api/posts），无需修改任何代码。
//
// ⚠️ 说明：Next.js 14 不支持 TypeScript 配置文件（next.config.ts），
//    此功能在 Next.js 15 中才可用。升级到 Next 15 后可直接改名为 next.config.ts。

const isDevelopment = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境兼容: rewrites 仅开发环境启用
  ...(isDevelopment && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    },
  }),

  // ============ 安全响应头（登录/注册安全加固） ============
  // 注: CSP 只加不破坏功能的子集 —— Next 页面依赖内联脚本/样式，
  //     不能加 script-src 白名单，否则页面交互全部失效。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 防点击劫持（iframe 嵌入）
          { key: 'X-Frame-Options', value: 'DENY' },
          // 防 MIME 嗅探（阻止把上传/代理内容当脚本执行）
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 防 URL 泄露（外部站点只能看到来源站点，看不到路径）
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 限制浏览器功能调用权限（摄像头/麦克风/定位本社区用不到）
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP 子集：禁 iframe 嵌入 + 表单只能提交本站（配合限流防 CSRF 式表单轰炸）
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
      {
        // 认证页面禁止缓存：防止登录页（含 ?redirect=）被浏览器/代理缓存
        source: '/auth/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
