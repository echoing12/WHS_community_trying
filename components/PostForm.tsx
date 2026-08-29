'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Send } from 'lucide-react';
import CategorySelect from '@/components/CategorySelect';
import FileUploader from '@/components/FileUploader';
import MarkdownView from '@/components/MarkdownView';
import TagPicker from '@/components/TagPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createPost, updatePost } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// 帖子表单（发布 / 编辑共用）
// mode: 'create' 创建后跳转新帖；'edit' 保存后返回原帖
export default function PostForm({
  mode,
  postId,
  initial,
}: {
  mode: 'create' | 'edit';
  postId?: string;
  initial?: { title: string; content: string; tags: string[]; category_id?: string };
}) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      setError(t('标题和内容都不能为空哦'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const input = {
        title: title.trim(),
        content: content.trim(),
        tags,
        category_id: categoryId || undefined,
      };
      if (mode === 'create') {
        const { id } = await createPost(input);
        router.push(`/post/${id}`);
      } else if (postId) {
        await updatePost(postId, input);
        router.push(`/post/${postId}`);
      }
    } catch {
      // 401/403/400 已由 axios 拦截器统一弹窗处理，这里不重复提示
      setSubmitting(false);
    }
  };

  // 插入附件：把 markdown 语法（图片 / PDF 链接）追加到正文末尾
  const insertMarkdown = (markdown: string) => {
    setContent((prev) => prev + markdown);
  };

  return (
    <div className="hand-card space-y-5 p-6 lg:p-8">
      {/* 标题 */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-bold">
          {t('标题')} <span className="text-ink/40">*</span>
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('用一句话说清楚你想聊什么')}
          maxLength={60}
        />
      </div>

      {/* 分类 + 标签 */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold">{t('分类（可选）')}</label>
          <CategorySelect value={categoryId} onChange={setCategoryId} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">{t('标签（可多选）')}</label>
          <TagPicker value={tags} onChange={setTags} />
        </div>
      </div>

      {/* 内容 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="content" className="text-sm font-bold">
            {t('内容')} <span className="text-ink/40">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <FileUploader kind="image" onInsert={insertMarkdown} />
            <FileUploader kind="document" onInsert={insertMarkdown} />
            <FileUploader kind="video" onInsert={insertMarkdown} />
            {/* 编辑 / 预览切换（方框圆角分段控件） */}
            <div className="flex rounded-lg border border-ink/15 bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-4 py-1 text-xs font-medium transition-colors',
                  !preview ? 'bg-ink-solid text-on-solid' : 'hover:bg-ink/5'
                )}
              >
                <EyeOff className="h-3.5 w-3.5" />
                {t('编辑')}
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-4 py-1 text-xs font-medium transition-colors',
                  preview ? 'bg-ink-solid text-on-solid' : 'hover:bg-ink/5'
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {t('预览')}
              </button>
            </div>
          </div>
        </div>

        {preview ? (
          <div className="min-h-[240px] rounded-xl border border-ink/10 bg-surface/60 p-5">
            {content.trim() ? (
              <MarkdownView content={content} />
            ) : (
              <p className="text-ink/40">{t('还没有内容，切回「编辑」开始写吧～')}</p>
            )}
          </div>
        ) : (
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('支持 Markdown 简版：\n# 一级标题\n## 二级标题\n**加粗**、*斜体*\n- 列表项\n> 引用\n\n内容不要太长，方便其他家长快速读完。')}
            rows={10}
          />
        )}

        {/* Markdown 语法速查 */}
        <p className="text-xs text-ink/50">
          {t('支持 Markdown 简版：# 标题 · **加粗** · *斜体* · - 列表 · &gt; 引用')}
        </p>
      </div>

      {/* 隐私提示 */}
      <div className="rounded-xl border border-ink/10 bg-butter/40 p-4 text-sm leading-relaxed text-ink/80">
        💡 <span className="font-medium">{t('💡 发帖提示：')}</span>
        {t('请勿在帖中公开姓名、电话、住址等个人隐私信息；涉及孩子健康问题请以主治医生的意见为准，本论坛不提供医疗建议。')}
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting} size="lg">
          <Send className="h-4 w-4" />
          {submitting ? t('发布中…') : mode === 'create' ? t('发布帖子') : t('保存修改')}
        </Button>
      </div>
    </div>
  );
}
