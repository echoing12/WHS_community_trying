'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PenLine, Search } from 'lucide-react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import LoginHint from '@/components/LoginHint';
import PostCard from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { fetchPosts, fetchPostsByTag, fetchTags, type PostListResult } from '@/lib/api';
import { cn } from '@/lib/utils';

// 每页帖子数（GET /api/threads 的 page_size）
const PAGE_SIZE = 20;

// 标签筛选时统一返回类型：该接口（GET /api/tags/{name}）无分页，一次返回全部
const fetchPostsPage = (tag: string, page: number): Promise<PostListResult> =>
  tag
    ? fetchPostsByTag(tag).then((threads) => ({
        threads,
        total: threads.length,
        totalPages: 1,
        currentPage: 1,
      }))
    : fetchPosts({ page, pageSize: PAGE_SIZE });

export default function HomePage() {
  // 基于Storyden官方规格: 写操作按钮（发布新帖）按登录状态动态显示
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');

  // 帖子列表：SWR 无限加载（分页）。翻页保留旧数据（keepPreviousData），
  // 标签筛选或回到「全部」时自动重新验证；从其他页面返回时走 SWR 缓存不重新拉取。
  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite(
    (index) => ['posts', activeTag, index + 1],
    ([, tag, page]) => fetchPostsPage(tag, page),
    { keepPreviousData: true }
  );
  const posts = (data ?? []).flatMap((d) => d.threads);
  const lastPage = data?.[data.length - 1];
  // 「加载更多」可用条件：非标签筛选（该接口无分页），且最后一页拉满了一页
  const hasMore = !activeTag && !!lastPage && lastPage.threads.length >= PAGE_SIZE;
  const loading = isLoading && posts.length === 0;

  // 标签列表：60 秒内不重复请求（GET /api/tags；取名称用于筛选条）
  const { data: tagItems = [] } = useSWR('tags', fetchTags, { dedupingInterval: 60_000 });
  const allTags = tagItems.map((t) => t.name);

  // 搜索仍为客户端按标题过滤（真实 API 的 ?q= 只匹配标题，行为一致）
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return posts;
    return posts.filter((post) => post.title.toLowerCase().includes(kw));
  }, [posts, keyword]);

  return (
    <div className="space-y-8">
      {/* 欢迎横幅 */}
      <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">🌿 欢迎回家，我们在一起</h1>
          <p className="mt-2 text-ink/70">
            分享经验、互相打气，这里属于每一位 WHS 患者的家庭。
          </p>
        </div>
        <span className="rotate-2 rounded-full border-2 border-dashed border-ink bg-butter px-5 py-2 font-bold italic shadow-hand-sm">
          在这里，你不孤单 ✏️
        </span>
      </section>

      {/* 搜索框 + 发布新帖按钮 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子标题…"
            className="pl-11"
          />
        </div>
        {!authLoading && (isAuthenticated ? (
          // 基于Storyden官方规格: Member/Admin 显示发布入口
          <Link href="/create">
            <Button className="w-full sm:w-auto">
              <PenLine className="h-4 w-4" />
              发布新帖
            </Button>
          </Link>
        ) : (
          // 基于Storyden官方规格: Guest（未登录）隐藏写操作按钮，显示登录提示
          <div className="flex w-full items-center justify-center py-2 sm:w-auto sm:py-0">
            <LoginHint redirect="/create" />
          </div>
        ))}
      </div>

      {/* 标签筛选（真实标签列表） */}
      <div className="flex flex-wrap gap-2">
        <TagChip active={activeTag === ''} onClick={() => setActiveTag('')}>
          全部
        </TagChip>
        {allTags.map((tag) => (
          <TagChip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
            {tag}
          </TagChip>
        ))}
      </div>

      {/* 帖子列表 */}
      {loading ? (
        <p className="py-16 text-center text-ink/50">加载中…</p>
      ) : error && posts.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">帖子加载失败，请检查网络后重试</p>
          <Button className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">没有找到相关帖子</p>
          <p className="mt-2 text-sm text-ink/60">换个关键词试试，或者来发布第一帖吧！</p>
          {!authLoading && (isAuthenticated ? (
            <Link href="/create" className="mt-4 inline-block">
              <Button>去发布</Button>
            </Link>
          ) : (
            <div className="mt-4">
              <LoginHint redirect="/create" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filtered.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* 加载更多（分页） */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="default"
                disabled={isLoading}
                onClick={() => setSize((s) => s + 1)}
              >
                {isLoading ? '加载中…' : '加载更多'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border-2 border-dashed border-ink/60 px-4 py-1.5 text-sm font-bold transition-colors hover:bg-butter',
        active && 'border-ink bg-ink-solid text-on-solid hover:bg-ink-solid'
      )}
    >
      {children}
    </button>
  );
}
