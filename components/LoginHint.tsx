'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============ 登录提示（基于Storyden官方规格权限模型） ============
// 未登录访客（Guest，只读）隐藏所有写操作按钮，改为显示本提示；
// redirect 参数让用户登录后直接跳回原页面
export default function LoginHint({
  redirect,
  className,
}: {
  redirect?: string;
  className?: string;
}) {
  const href = `/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
  return (
    <p className={cn('text-sm font-bold text-ink/60', className)}>
      登录后可互动，
      <Link href={href} className="underline underline-offset-2 transition-colors hover:text-ink">
        去登录
      </Link>
    </p>
  );
}
