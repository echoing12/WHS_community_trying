'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Pin, Send } from 'lucide-react';
import useSWR from 'swr';
import BookmarkMenu from '@/components/BookmarkMenu';
import Comment from '@/components/Comment';
import ContentActions from '@/components/ContentActions';
import LoginHint from '@/components/LoginHint';
import MarkdownView from '@/components/MarkdownView';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { createReply, deletePost, fetchPostDetail, togglePostLike } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // 基于Storyden官方规格: 评论 / 点赞 / 收藏等写操作按登录状态动态显示
  const { isAuthenticated, isLoading, user } = useAuth();

  // 点赞 / 收藏状态从接口数据初始化，点赞动画用 pop 计数触发
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likePop, setLikePop] = useState(0); // 每次递增触发点赞弹跳动画
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  // 帖子详情：SWR 缓存（从首页列表/其他页面进入时命中缓存秒开），
  // 评论 / 嵌套回复提交后 mutate() 静默刷新（评论列表以服务端为准，不闪加载态）
  const { data: post, error, isLoading: detailLoading, mutate } = useSWR(
    id ? ['post', id] : null,
    () => fetchPostDetail(id as string),
    { keepPreviousData: true }
  );

  // 点赞 / 收藏状态在数据刷新后同步（SWR 重新验证返回的 is_liked/is_collected 为准）
  useEffect(() => {
    setLiked(!!post?.is_liked);
    setBookmarked(!!post?.is_collected);
  }, [post]);

  // ============ 点赞 / 收藏切换（真实 API：PUT/DELETE /api/likes/posts/[id]、
  // /api/collections/{mark}/posts/{id}；乐观更新，失败回滚） ============
  const toggleLike = async () => {
    if (!isAuthenticated || !post) return;
    const next = !liked;
    setLiked(next);
    setLikePop((p) => p + 1); // 触发弹跳动画
    try {
      // 真实 API：POST /api/likes/posts/{id}（PUT）点赞 / DELETE 取消
      await togglePostLike(post.id, next);
    } catch {
      setLiked(!next); // 失败回滚
    }
  };

  // 收藏改由 BookmarkMenu 管理（多收藏夹选择器，真实 API PUT/DELETE /api/collections/{mark}/posts/{id}）

  // 发表评论 / 嵌套回复：POST /api/threads/[id]/replies，成功后 mutate 静默刷新（评论列表以服务端为准）
  const submitComment = async () => {
    if (!isAuthenticated || !newComment.trim() || !post) return;
    setSending(true);
    try {
      await createReply(post.id, newComment.trim());
      setNewComment('');
      await mutate();
    } catch {
      // 401/403/400 已由拦截器统一提示
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (threadId: string, content: string, replyTo?: string) => {
    await createReply(threadId, content, replyTo);
    await mutate();
  };

  if (detailLoading && !post) {
    return <p className="py-16 text-center text-ink/50">加载中…</p>;
  }

  if (!post) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-bold">{error ? '帖子加载失败，请检查网络后重试' : '帖子不存在或已被删除'}</p>
        <div className="mt-4 flex justify-center gap-3">
          {error ? (
            <Button onClick={() => mutate()}>重试</Button>
          ) : null}
          <Link href="/" className="inline-block">
            <Button variant="default">
              <ArrowLeft className="h-4 w-4" />
              返回首页
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
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/60 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      {/* 帖子主体 */}
      <div className="hand-card p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="hand-title flex-1 text-2xl text-ink lg:text-3xl">
            {post.is_pinned && (
              <span
                title="置顶帖"
                className="mr-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-full border-2 border-dashed border-ink bg-butter px-2 py-0.5 text-sm text-ink"
              >
                <Pin className="h-3.5 w-3.5" />
                置顶
              </span>
            )}
            {post.title}
          </h1>
          {/* 作者操作（编辑 / 删除） */}
          <ContentActions
            isAuthor={!!user?.handle && post.author.handle === user.handle}
            editHref={`/post/${post.id}/edit`}
            onDelete={() => deletePost(post.id)}
            deletePrompt="确定要删除这篇帖子吗？删除后无法恢复。"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink/70">
          <Avatar name={post.author.name} src={post.author.avatar} />
          <div>
            <p className="font-bold">{post.author.name}</p>
            <p className="text-xs text-ink/50">{post.author.bio || 'TA 还没有填写简介'}</p>
          </div>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(post.created_at)}</span>
          <div className="flex w-full gap-2 sm:w-auto">
            {post.category && <Badge variant="butter">{post.category.name}</Badge>}
            {post.tags?.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>

        {/* Markdown 正文（真实 API 的 body 为 HTML，已在 lib/api.ts 转为 Markdown） */}
        <div className="mt-6 border-t-2 border-dashed border-ink/20 pt-6">
          <MarkdownView content={post.content} />
        </div>

        {/* 点赞 / 收藏 */}
        {isLoading ? null : isAuthenticated ? (
          <div className="mt-6 flex items-center gap-3 border-t-2 border-dashed border-ink/20 pt-6">
            <button
              onClick={toggleLike}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border-2 border-dashed border-ink/60 px-5 py-2 text-sm font-bold transition-colors hover:bg-butter active:scale-95',
                liked && 'border-ink bg-butter'
              )}
            >
              <Heart
                key={likePop} // 点击时重新挂载，重放弹跳动画
                className={cn(
                  'h-4 w-4 transition-transform',
                  liked && 'fill-ink',
                  likePop > 0 && 'animate-like-pop'
                )}
              />
              {liked ? '已点赞' : '点赞'}
              <span className="text-ink/60">
                {post.like_count + (liked ? 1 : 0) - (post.is_liked ? 1 : 0)}
              </span>
            </button>
            <BookmarkMenu
              kind="post"
              itemId={post.id}
              initiallyCollected={bookmarked}
              onChange={setBookmarked}
            />
          </div>
        ) : (
          // 基于Storyden官方规格: Guest（未登录）隐藏写操作按钮，显示登录提示
          <div className="mt-6 flex items-center gap-3 border-t-2 border-dashed border-ink/20 pt-6">
            <LoginHint redirect={`/post/${post.id}`} />
          </div>
        )}
      </div>

      {/* 评论区 */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          评论 <span className="text-sm text-ink/50">（{post.reply_count ?? post.replies.length}）</span>
        </h2>

        {/* 发表评论 */}
        {isLoading ? null : isAuthenticated ? (
          <div className="hand-card p-5">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的想法，给 TA 一点鼓励…"
              rows={3}
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={submitComment} disabled={sending || !newComment.trim()}>
                <Send className="h-4 w-4" />
                发表评论
              </Button>
            </div>
          </div>
        ) : (
          // 基于Storyden官方规格: 未登录时评论区显示「请登录后参与讨论」
          <div className="hand-card p-5 text-center">
            <p className="text-sm font-bold text-ink/60">请登录后参与讨论</p>
            <Link
              href={`/auth/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`}
              className="mt-3 inline-block"
            >
              <Button size="sm">去登录</Button>
            </Link>
          </div>
        )}

        {/* 评论列表（支持嵌套回复） */}
        {post.replies.length === 0 ? (
          <p className="py-8 text-center text-ink/50">还没有评论，来抢沙发吧～</p>
        ) : (
          <div className="space-y-4">
            {post.replies.map((comment) => (
              <Comment key={comment.id} comment={comment} onReply={handleReply} threadId={post.id} />
            ))}
          </div>
        )}
      </section>

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        本论坛仅供 WHS 患者交流，不构成医疗建议
      </p>
    </article>
  );
}
