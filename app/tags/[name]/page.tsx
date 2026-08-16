'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, Hash, LinkIcon, MessageCircle, SearchX } from 'lucide-react';
import PostCard from '@/components/PostCard';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchTagDetail } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import type { LibraryNode, LinkItem, TagDetail } from '@/types';

export default function TagDetailPage() {
  const params = useParams();
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const decoded = name ? decodeURIComponent(name) : '';

  const [detail, setDetail] = useState<TagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!decoded) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchTagDetail(decoded);
      setDetail(data);
    } catch {
      setDetail(null);
      setError('标签内容加载失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, [decoded]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return <p className="py-16 text-center text-ink/50">加载中…</p>;
  }

  if (!detail) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-bold">{error || '标签不存在'}</p>
        <div className="mt-4 flex justify-center gap-3">
          {error ? <Button onClick={loadDetail}>重试</Button> : null}
          <Link href="/tags" className="inline-block">
            <Button>返回标签列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="hand-card p-6 lg:p-8">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-ink/60" />
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">{detail.tag.name}</h1>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink/60">
          {/* 分类计数（真实 API 只提供总使用频次，分类计数仅在有数据时展示） */}
          {(detail.tag.posts_count > 0 ||
            detail.tag.library_count > 0 ||
            detail.tag.links_count > 0) && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              帖子 {detail.tag.posts_count} · <BookOpen className="h-4 w-4" />
              知识库 {detail.tag.library_count} · <LinkIcon className="h-4 w-4" />
              链接 {detail.tag.links_count}
            </span>
          )}
          <span>共使用 {detail.tag.count} 次</span>
        </p>
      </section>

      {/* 帖子（真实 API：GET /api/tags/{name} 的 items 中 kind=thread） */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          帖子 <span className="text-sm text-ink/50">（{detail.posts.length}）</span>
        </h2>
        {detail.posts.length === 0 ? (
          <EmptyCard text="这个标签下还没有帖子" />
        ) : (
          <div className="space-y-4">
            {detail.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* 知识库页面（items 中 kind=node） */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          知识库页面 <span className="text-sm text-ink/50">（{detail.library_pages.length}）</span>
        </h2>
        {detail.library_pages.length === 0 ? (
          <EmptyCard text="这个标签下还没有知识库页面" />
        ) : (
          <div className="space-y-4">
            {detail.library_pages.map((page) => (
              <LibraryCard key={page.id} page={page} />
            ))}
          </div>
        )}
      </section>

      {/* 链接（items 中 kind=link） */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          链接 <span className="text-sm text-ink/50">（{detail.links.length}）</span>
        </h2>
        {detail.links.length === 0 ? (
          <EmptyCard text="这个标签下还没有链接" />
        ) : (
          <div className="space-y-4">
            {detail.links.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </section>

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        本社区仅供 WHS 患者交流，不构成医疗建议
      </p>
    </div>
  );
}

// 空状态占位
function EmptyCard({ text }: { text: string }) {
  return (
    <div className="hand-card flex flex-col items-center gap-2 p-8 text-center">
      <SearchX className="h-6 w-6 text-ink/40" />
      <p className="text-sm font-bold text-ink/60">{text}</p>
    </div>
  );
}

// 知识库页面卡片（列表页复用样式）
function LibraryCard({ page }: { page: LibraryNode }) {
  return (
    <Link href={`/library/${page.slug}`} className="group block">
      <article className="hand-card p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-ink/60" />
          <h3 className="hand-title min-w-0 flex-1 truncate text-lg text-ink group-hover:underline">
            {page.title}
          </h3>
          <Badge variant="butter">知识库</Badge>
        </div>
        {page.summary && <p className="mt-2 line-clamp-2 text-sm text-ink/60">{page.summary}</p>}
        <div className="mt-3 flex items-center gap-3 text-sm text-ink/70">
          <Avatar name={page.author.name} src={page.author.avatar} size="sm" />
          <span className="font-bold">{page.author.name}</span>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(page.created_at)}</span>
        </div>
      </article>
    </Link>
  );
}

// 链接卡片（列表页复用样式；真实 API 的 Link 无作者/时间字段，仅在接口提供时展示）
function LinkCard({ link }: { link: LinkItem }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="group block">
      <article className="hand-card p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 shrink-0 text-ink/60" />
          <h3 className="hand-title min-w-0 flex-1 truncate text-lg text-ink group-hover:underline">
            {link.title}
          </h3>
          <Badge>链接</Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-ink/60">{link.description}</p>
        <div className="mt-3 flex items-center gap-3 text-sm text-ink/70">
          {link.author.name && link.author.name !== '社区成员' && (
            <>
              <Avatar name={link.author.name} src={link.author.avatar} size="sm" />
              <span className="font-bold">{link.author.name}</span>
              <span className="text-ink/40">·</span>
            </>
          )}
          {link.created_at && (
            <>
              <span>{formatRelativeTime(link.created_at)}</span>
              <span className="text-ink/40">·</span>
            </>
          )}
          <span className="max-w-[12rem] truncate font-medium text-ink/50">{link.domain}</span>
        </div>
      </article>
    </a>
  );
}
