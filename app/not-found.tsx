import Link from 'next/link';
import { Button } from '@/components/ui/button';

// 全局 404：路由不存在的统一页面
export default function NotFound() {
  return (
    <div className="hand-card p-10 text-center">
      <p className="hand-title text-5xl text-ink">404</p>
      <p className="mt-3 font-bold text-ink/70">页面不存在或已被删除</p>
      <Link href="/" className="mt-6 inline-block">
        <Button>返回首页</Button>
      </Link>
    </div>
  );
}
