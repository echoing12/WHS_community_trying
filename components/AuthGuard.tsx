'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';

// ============ 客户端路由守卫（基于Storyden官方规格） ============
// - middleware.ts 在服务端按 Cookie 做首道拦截（快速、不请求 API）
// - 本组件在客户端二次校验真实会话状态（GET /api/session 的判定结果），
//   覆盖「Cookie 还在但会话已失效」的场景
// - 未登录 → 跳转 /auth/login?redirect=当前路径（登录后跳回）
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
