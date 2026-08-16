'use client';

import AuthGuard from '@/components/AuthGuard';
import PostForm from '@/components/PostForm';

export default function CreatePage() {
  // 基于Storyden官方规格: 需要登录的路由由 AuthGuard 客户端校验（middleware 服务端首道拦截）
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">✏️ 发布新帖</h1>
          <p className="mt-2 text-sm text-ink/60">
            分享你的经验、困惑或好消息，每一篇帖子都会照亮另一个家庭。
          </p>
        </div>
        <PostForm mode="create" />
      </div>
    </AuthGuard>
  );
}
