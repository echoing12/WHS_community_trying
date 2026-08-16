'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// 全局错误边界：页面渲染出错时的统一兜底（App Router 约定文件）
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 本社区暂无日志服务，记录到控制台便于排查
    console.error('页面渲染错误:', error);
  }, [error]);

  return (
    <div className="hand-card p-10 text-center">
      <p className="hand-title text-4xl text-ink">😥 出了点问题</p>
      <p className="mt-3 text-ink/70">页面加载失败，请重试或返回首页</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>重试</Button>
        <Link href="/" className="inline-block">
          <Button variant="solid">返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
