'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/utils';
import type { Comment as CommentData } from '@/types';

// 评论组件（支持嵌套回复，递归渲染子评论）
// onReply: 提交回复（POST /api/threads/[id]/replies，reply_to = 父评论 id）
export default function Comment({
  comment,
  onReply,
  threadId,
}: {
  comment: CommentData;
  onReply: (threadId: string, content: string, replyTo?: string) => Promise<void>;
  threadId: string;
}) {
  // 基于Storyden官方规格: 「回复」属写操作，Guest（未登录）隐藏
  const { isAuthenticated } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const submitReply = async () => {
    if (!isAuthenticated || !replyText.trim()) return;
    setSending(true);
    try {
      // 真实 API：POST /api/threads/{id}/replies，reply_to 指向被回复的评论
      await onReply(threadId, replyText.trim(), comment.id);
      setReplyText('');
      setReplying(false);
    } catch {
      // 401/403/400 已由拦截器统一提示
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-surface/70 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Avatar name={comment.author} size="sm" />
          <span className="font-bold">{comment.author}</span>
          <span className="text-ink/40">·</span>
          <span className="text-ink/40">{formatRelativeTime(comment.created_at)}</span>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>

        {isAuthenticated && (
          <button
            onClick={() => setReplying((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ink/60 transition-colors hover:text-ink"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            回复
          </button>
        )}

        {replying && (
          <div className="mt-2 flex gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`回复 ${comment.author}…`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitReply();
              }}
              disabled={sending}
            />
            <Button size="sm" onClick={submitReply} disabled={sending}>
              发送
            </Button>
          </div>
        )}
      </div>

      {/* 嵌套子回复 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 space-y-3 border-l-2 border-dashed border-ink/20 pl-4 lg:ml-8 lg:pl-6">
          {comment.replies.map((reply) => (
            <Comment key={reply.id} comment={reply} onReply={onReply} threadId={threadId} />
          ))}
        </div>
      )}
    </div>
  );
}
