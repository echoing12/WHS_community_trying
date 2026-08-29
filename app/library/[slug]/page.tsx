'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import useSWR from 'swr';
import BookmarkMenu from '@/components/BookmarkMenu';
import ContentActions from '@/components/ContentActions';
import LoginHint from '@/components/LoginHint';
import MarkdownView from '@/components/MarkdownView';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { deleteLibraryPage, fetchLibraryPage } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function LibraryPageDetail() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const searchParams = useSearchParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  // 知识库页面刚保存为草稿时（?draft=1）展示提示横幅
  const justCreatedDraft = searchParams.get('draft') === '1';

  // 基于Storyden官方规格: 收藏属写操作（COLLECTION_SUBMIT），按登录状态显示
  const { isAuthenticated, isLoading, user } = useAuth();

  // 页面详情：SWR 缓存（从知识库树/其他页面进入时命中缓存秒开）
  const { data: page, error, isLoading: pageLoading, mutate } = useSWR(
    slug ? ['library-page', slug] : null,
    () => fetchLibraryPage(slug as string),
    { keepPreviousData: true }
  );
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    setBookmarked(!!page?.is_collected);
  }, [page]);

  const loading = pageLoading && !page;

  if (loading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (!page) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">
          {error ? t('知识库页面加载失败，请检查网络后重试') : t('知识库页面不存在或已被删除')}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          {error ? <Button onClick={() => mutate()}>{t('重试')}</Button> : null}
          <Link href="/library" className="inline-block">
            <Button variant="default">
              <ArrowLeft className="h-4 w-4" />
              {t('返回知识库')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('返回')}
      </button>

      {/* 草稿提示（真实 API：StoryDen 仅管理员可直接发布知识库节点，普通成员保存为草稿） */}
      {justCreatedDraft && (
        <div className="rounded-xl border border-ink/10 bg-butter/40 p-4 text-sm leading-relaxed text-ink/80">
          💡 {t('知识库页面已保存为草稿：StoryDen 仅管理员可直接发布，草稿等待管理员审核后公开（草稿期间仅自己可见）。')}
        </div>
      )}

      {/* 页面主体 */}
      <div className="hand-card p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="butter">
              <BookOpen className="h-3 w-3" />
              {t('知识库')}
            </Badge>
            {page.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {/* 作者操作（编辑 / 删除） */}
          <ContentActions
            isAuthor={!!user?.handle && page.author.handle === user.handle}
            editHref={`/library/${page.slug}/edit`}
            onDelete={() => deleteLibraryPage(page.slug)}
            deletePrompt={t('确定要删除这个知识库页面吗？删除后无法恢复。')}
          />
        </div>
        <h1 className="hand-title mt-3 text-2xl text-ink lg:text-3xl">{page.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink/70">
          <Avatar name={page.author.name} src={page.author.avatar} />
          <div>
            <p className="font-medium">{page.author.name}</p>
            <p className="text-xs text-ink/50">{page.author.bio || t('TA 还没有填写简介')}</p>
          </div>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(page.created_at)}</span>
          {page.updated_at && (
            <>
              <span className="text-ink/40">·</span>
              <span>{t('更新于 {time}', { time: formatRelativeTime(page.updated_at) })}</span>
            </>
          )}
        </div>

        {/* Markdown 正文（真实 API 的 content 为 HTML，已在 lib/api.ts 转为 Markdown） */}
        <div className="mt-6 border-t border-ink/10 pt-6">
          <MarkdownView content={page.content ?? ''} />
        </div>

        {/* 收藏（真实 API 无节点点赞接口，点赞按钮已移除） */}
        {isLoading ? null : isAuthenticated ? (
          <div className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-6">
            {/* 收藏（真实 API：PUT/DELETE /api/collections/{mark}/nodes/{node_id}，支持多收藏夹） */}
            <BookmarkMenu
              kind="node"
              itemId={page.id}
              initiallyCollected={bookmarked}
              onChange={setBookmarked}
            />
          </div>
        ) : (
          // 基于Storyden官方规格: Guest（未登录）隐藏写操作按钮，显示登录提示
          <div className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-6">
            <LoginHint redirect={`/library/${slug}`} />
          </div>
        )}
      </div>

      {/* 免责声明 */}
      <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
        {t('知识库内容由家长互助整理，仅供参考，不构成医疗建议；请以主治医生的意见为准')}
      </p>
    </article>
  );
}
