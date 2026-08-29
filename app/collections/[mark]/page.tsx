'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bookmark, BookOpen, SearchX } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import PostCard from '@/components/PostCard';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchCollectionItems, fetchMyCollections } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { formatRelativeTime } from '@/lib/utils';
import type { LibraryNode } from '@/types';

// 收藏夹详情（真实 API：GET /api/collections/{mark}）
export default function CollectionDetailPage() {
  const params = useParams();
  const t = useT();
  const mark = Array.isArray(params.mark) ? params.mark[0] : params.mark;

  const [name, setName] = useState(t('我的收藏'));
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof fetchCollectionItems>>['posts']>([]);
  const [pages, setPages] = useState<Awaited<ReturnType<typeof fetchCollectionItems>>['library_pages']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!mark) return;
    setLoading(true);
    setError('');
    try {
      // 取收藏夹名称（列表接口），再取内容
      const list = await fetchMyCollections();
      const found = list.find((c) => c.slug === mark || c.id === mark);
      if (found) setName(found.name);
      const items = await fetchCollectionItems(mark);
      setPosts(items.posts);
      setPages(items.library_pages);
    } catch {
      setError(t('收藏夹加载失败，请检查网络后重试'));
    } finally {
      setLoading(false);
    }
  }, [mark, t]);

  useEffect(() => {
    load();
  }, [load]);

  const total = posts.length + pages.length;

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* 返回 */}
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('返回收藏夹')}
        </Link>

        {/* 页头 */}
        <section className="hand-card p-6">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-ink/60" />
            <h1 className="hand-title text-2xl text-ink lg:text-3xl">{name}</h1>
          </div>
          <p className="mt-2 text-sm text-ink/60">{t('共 {n} 项收藏', { n: total })}</p>
        </section>

        {/* 内容 */}
        {loading ? (
          <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>
        ) : error ? (
          <div className="hand-card p-10 text-center">
            <p className="font-medium">{error}</p>
            <Button className="mt-4" onClick={load}>
              {t('重试')}
            </Button>
          </div>
        ) : total === 0 ? (
          <div className="hand-card flex flex-col items-center gap-2 p-10 text-center">
            <SearchX className="h-6 w-6 text-ink/40" />
            <p className="font-medium">{t('这个收藏夹还是空的')}</p>
            <p className="mt-1 text-sm text-ink/60">{t('在帖子或知识库页面点「收藏」即可加入。')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-ink/60">
                  {t('帖子')} <span className="text-ink/40">{t('（{n}）', { n: posts.length })}</span>
                </p>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
            {pages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-ink/60">
                  {t('知识库页面')} <span className="text-ink/40">{t('（{n}）', { n: pages.length })}</span>
                </p>
                {pages.map((page) => (
                  <CollectionPageCard key={page.id} page={page} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 免责声明 */}
        <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
          {t('本论坛仅供 WHS 患者交流，不构成医疗建议')}
        </p>
      </div>
    </AuthGuard>
  );
}

// 收藏的知识库页面卡片
function CollectionPageCard({ page }: { page: LibraryNode }) {
  const t = useT();
  return (
    <Link href={`/library/${page.slug}`} className="group block">
      <article className="hand-card p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-ink/60" />
          <h3 className="hand-title min-w-0 flex-1 truncate text-lg text-ink group-hover:underline">
            {page.title}
          </h3>
          <Badge variant="butter">{t('知识库')}</Badge>
        </div>
        {page.summary && <p className="mt-2 line-clamp-2 text-sm text-ink/60">{page.summary}</p>}
        <div className="mt-3 flex items-center gap-3 text-sm text-ink/70">
          <Avatar name={page.author.name} src={page.author.avatar} size="sm" />
          <span className="font-medium">{page.author.name}</span>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(page.created_at)}</span>
        </div>
      </article>
    </Link>
  );
}
