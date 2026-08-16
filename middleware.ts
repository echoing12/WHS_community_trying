import { NextResponse, type NextRequest } from 'next/server';

// ============ 路由守卫（基于Storyden官方规格） ============
// Storyden 使用 Cookie 会话认证，Cookie 名为 storyden-session（连字符）；
// middleware 在服务端按 Cookie 存在性做首道拦截（快速、不请求 API），
// 会话是否真正有效由 GET /api/session 判定（客户端 useAuth + AuthGuard 二次拦截）。

// 真实 StoryDen 会话 Cookie 名为 storyden-session（连字符，由后端 Set-Cookie 下发）
const SESSION_COOKIE = 'storyden-session';

// 需要登录才能访问的路由（/library/create 精确匹配，避免误伤 /library/[slug] 等公开路由；
// /admin 下均为管理员页面，页面内再做管理员身份二次校验）
const PROTECTED_PATHS = [
  '/create',
  '/library/create',
  '/links/submit',
  '/profile',
  '/collections',
  '/admin',
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  // 已登录用户访问登录页 → 跳回首页
  if (pathname === '/auth' || pathname === '/auth/login') {
    if (hasSession) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  // 未登录访问受保护路由 → 跳登录页并携带 redirect（登录后跳回原页面）
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/create',
    '/library/create',
    '/links/submit',
    '/profile',
    '/collections',
    '/collections/:path*',
    '/admin',
    '/admin/:path*',
    '/auth',
    '/auth/login',
  ],
};
