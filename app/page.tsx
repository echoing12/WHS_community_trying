'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PenLine, Search } from 'lucide-react';
import LoginHint from '@/components/LoginHint';
import PostCard from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { fetchPosts, fetchPostsByTag, fetchTags } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/types';

export default function HomePage() {
  // 基于Storyden官方规格: 写操作按钮（发布新帖）按登录状态动态显示
  const { isAuthenticated, isLoading } = useAuth();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');

  // 标签筛选改为后端聚合（GET /api/tags/{name}），
  // 因为真实 threads 响应中的 tags 字段可能为空，客户端过滤不可靠
  const loadPosts = useCallback(async (tag: string) => {
    setLoading(true);
    setError('');
    try {
      const data = tag ? await fetchPostsByTag(tag) : await fetchPosts();
      setPosts(data);
    } catch {
      setError('帖子加载失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(activeTag);
  }, [loadPosts, activeTag]);

  // 真实标签列表（GET /api/tags），用于顶部筛选条
  useEffect(() => {
    fetchTags()
      .then((tags) => setAllTags(tags.map((t) => t.name)))
      .catch(() => setAllTags([]));
  }, []);

  // 搜索仍为客户端按标题过滤（真实 API 的 ?q= 只匹配标题，行为一致）
  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchKeyword =
        !keyword.trim() || post.title.toLowerCase().includes(keyword.trim().toLowerCase());
      return matchKeyword;
    });
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
        {!isLoading && (isAuthenticated ? (
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
      ) : error ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">{error}</p>
          <Button className="mt-4" onClick={() => loadPosts(activeTag)}>
            重试
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">没有找到相关帖子</p>
          <p className="mt-2 text-sm text-ink/60">换个关键词试试，或者来发布第一帖吧！</p>
          {!isLoading && (isAuthenticated ? (
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
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
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
