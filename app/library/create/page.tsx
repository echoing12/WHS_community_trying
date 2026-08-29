'use client';

import AuthGuard from '@/components/AuthGuard';
import LibraryForm from '@/components/LibraryForm';
import { useT } from '@/hooks/useLang';

export default function CreateLibraryPage() {
  // 基于Storyden官方规格: 需要登录的路由由 AuthGuard 客户端校验（middleware 服务端首道拦截）
  const t = useT();
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">{t('✍️ 写知识库页面')}</h1>
          <p className="mt-2 text-sm text-ink/60">
            {t('把你的经验沉淀成可以长期查阅的知识：确诊指南、康复方法、照护心得…')}
          </p>
        </div>
        <LibraryForm mode="create" />
      </div>
    </AuthGuard>
  );
}
