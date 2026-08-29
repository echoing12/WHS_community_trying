'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import LibraryForm from '@/components/LibraryForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { fetchLibraryPage } from '@/lib/api';
import type { LibraryNode } from '@/types';

// 编辑知识库页面（作者本人或管理员；PATCH /api/nodes/{slug}）
export default function EditLibraryPage() {
  const params = useParams();
  const t = useT();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  // 归属校验：非作者（且非管理员）直接访问编辑 URL 时拦截（后端 PATCH 也会 403 兜底）
  const { user, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState<LibraryNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPage = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      setPage(await fetchLibraryPage(slug));
    } catch {
      setError(t('知识库页面加载失败，请检查网络后重试'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading || authLoading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (!page) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{error || t('知识库页面不存在或已被删除')}</p>
        <Button className="mt-4" onClick={loadPage}>
          {t('重试')}
        </Button>
      </div>
    );
  }

  // 归属校验：仅作者本人或管理员可编辑
  const canEdit = user?.role === 'admin' || (!!user?.handle && page.author.handle === user.handle);
  if (!canEdit) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{t('您没有权限编辑这个知识库页面')}</p>
        <Link href={`/library/${page.slug}`} className="mt-4 inline-block">
          <Button>{t('返回页面')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">{t('✍️ 编辑知识库页面')}</h1>
          <p className="mt-2 text-sm text-ink/60">{t('修改后保存，知识库读者将看到最新内容。')}</p>
        </div>
        <LibraryForm
          mode="edit"
          slug={page.slug}
          initial={{
            title: page.title,
            content: page.content ?? '',
            summary: page.summary ?? '',
            tags: page.tags,
            parent_slug: page.parent_id,
          }}
        />
      </div>
    </AuthGuard>
  );
}
