'use client';

import Link from 'next/link';
import { Bookmark, Heart, MessageCircle, Pin } from 'lucide-react';
import ContentActions from '@/components/ContentActions';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { deletePost } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { PostListItem } from '@/types';

// 帖子卡片：标题 + 置顶标记 + 分类 + 标签 + 作者（头像/昵称）+ 发布时间 + 回复数 + 点赞数 + 收藏
// 作者本人可见「编辑 / 删除」操作（编辑 /post/[id]/edit，删除 DELETE /api/threads/{id}）
export default function PostCard({ post }: { post: PostListItem }) {
  const { user } = useAuth();
  const t = useT();
  const isAuthor = !!user?.handle && post.author.handle === user.handle;

  return (
    <Link href={`/post/${post.id}`} className="group block">
      <article className="hand-card p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="hand-title min-w-0 flex-1 text-lg text-ink group-hover:underline">
            {/* 置顶标记 */}
            {post.is_pinned && (
              <span
                title={t('置顶帖')}
                className="mr-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-md border border-ink/10 bg-butter px-2 py-0.5 text-xs font-medium text-ink"
              >
                <Pin className="h-3 w-3" />
                {t('置顶')}
              </span>
            )}
            {post.title}
          </h3>
          {/* 作者操作（编辑 / 删除） */}
          <ContentActions
            isAuthor={isAuthor}
            editHref={`/post/${post.id}/edit`}
            onDelete={() => deletePost(post.id)}
          />
        </div>

        {/* 分类 + 标签 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {post.category && (
            <Badge variant="butter">{post.category.name}</Badge>
          )}
          {post.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        {/* 作者信息 + 回复数 + 点赞数 + 收藏标记（窄屏允许换行，昵称超长截断） */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
          <Avatar name={post.author.name} src={post.author.avatar} size="sm" />
          <span className="max-w-[12rem] truncate font-bold">{post.author.name}</span>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(post.created_at)}</span>
          <span className="ml-auto inline-flex items-center gap-3 font-bold text-ink/60">
            <span className="inline-flex items-center gap-1.5">
              <Heart className={cn('h-4 w-4', post.is_liked && 'fill-ink text-ink')} />
              {post.like_count}
            </span>
            {/* 收藏标记（已收藏时显示实心图标） */}
            <span
              className={cn('inline-flex items-center gap-1.5', post.is_collected && 'text-ink')}
              title={post.is_collected ? t('已收藏') : t('未收藏')}
            >
              <Bookmark className={cn('h-4 w-4', post.is_collected && 'fill-ink')} />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {post.reply_count}
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}
