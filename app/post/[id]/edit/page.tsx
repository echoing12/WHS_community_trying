'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import PostForm from '@/components/PostForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { fetchPostDetail } from '@/lib/api';
import type { PostDetail } from '@/types';

// 编辑帖子（作者本人或管理员；PATCH /api/threads/{id}）
export default function EditPostPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  // 归属校验：非作者（且非管理员）直接访问编辑 URL 时拦截（后端 PATCH 也会 403 兜底）
  const { user, isLoading: authLoading } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setPost(await fetchPostDetail(id));
    } catch {
      setError('帖子加载失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  if (loading || authLoading) {
    return <p className="py-16 text-center text-ink/50">加载中…</p>;
  }

  if (!post) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-bold">{error || '帖子不存在或已被删除'}</p>
        <Button className="mt-4" onClick={loadPost}>
          重试
        </Button>
      </div>
    );
  }

  // 归属校验：仅作者本人或管理员可编辑
  const canEdit = user?.role === 'admin' || (!!user?.handle && post.author.handle === user.handle);
  if (!canEdit) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-bold">您没有权限编辑这篇帖子</p>
        <Link href={`/post/${post.id}`} className="mt-4 inline-block">
          <Button>返回帖子</Button>
        </Link>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">✏️ 编辑帖子</h1>
          <p className="mt-2 text-sm text-ink/60">修改后保存，其他家长将看到最新内容。</p>
        </div>
        <PostForm
          mode="edit"
          postId={post.id}
          initial={{
            title: post.title,
            content: post.content,
            tags: post.tags ?? [],
            category_id: post.category?.id,
          }}
        />
      </div>
    </AuthGuard>
  );
}
