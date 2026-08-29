'use client';

import { SproutDecor } from '@/components/Decor';
import { useT } from '@/hooks/useLang';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// 全局 404：路由不存在的统一页面
export default function NotFound() {
  const t = useT();
  return (
    <div className="hand-card relative overflow-hidden p-10 text-center">
      <SproutDecor className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rotate-[-14deg] text-ink/5" />
      <p className="hand-title text-5xl text-ink">404</p>
      <p className="mt-3 font-medium text-ink/60">{t('页面不存在或已被删除')}</p>
      <Link href="/" className="mt-6 inline-block">
        <Button>{t('返回首页')}</Button>
      </Link>
    </div>
  );
}
