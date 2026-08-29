'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, FolderTree, Send } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import MarkdownView from '@/components/MarkdownView';
import TagPicker from '@/components/TagPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createLibraryPage, fetchLibraryTree, updateLibraryPage } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';
import type { LibraryNode } from '@/types';

// 知识库表单（创建 / 编辑共用）
// mode: 'create' 创建后跳转新页；'edit' 保存后返回原页
export default function LibraryForm({
  mode,
  slug,
  initial,
}: {
  mode: 'create' | 'edit';
  slug?: string;
  initial?: { title: string; content: string; summary?: string; tags: string[]; parent_slug?: string | null };
}) {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  // 父级目录用 slug 选择（真实 API POST /api/nodes 的 parent 字段是父节点 slug）
  const [parentSlug, setParentSlug] = useState(initial?.parent_slug ?? '');
  const [parents, setParents] = useState<LibraryNode[]>([]);
  const [parentOpen, setParentOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 加载目录树，用于「父级目录」下拉选择
  useEffect(() => {
    fetchLibraryTree()
      .then(setParents)
      .catch(() => setParents([]));
  }, []);

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
        parent_slug: parentSlug || null,
        summary: summary.trim() || undefined,
      };
      if (mode === 'create') {
        const { slug: newSlug, draft } = await createLibraryPage(input);
        if (draft) {
          // 真实 API：StoryDen 仅管理员可发布知识库节点，普通成员保存为草稿（仅自己可见），
          // 通过 ?draft=1 在详情页顶部展示提示横幅
          router.push(`/library/${newSlug}?draft=1`);
        } else {
          router.push(`/library/${newSlug}`);
        }
      } else if (slug) {
        await updateLibraryPage(slug, input);
        router.push(`/library/${slug}`);
      }
    } catch {
      // 401/403/400 已由 axios 拦截器统一弹窗处理，这里不重复提示
      setSubmitting(false);
    }
  };

  // 插图：markdown 图片语法追加到内容末尾
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
          placeholder={t('用一句话说清楚这一页讲什么')}
          maxLength={60}
        />
      </div>

      {/* 父级目录 + 标签 */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* 父级目录（纯自绘下拉，同 TagPicker 风格） */}
        <div className="space-y-2">
          <label className="text-sm font-bold">{t('父级目录（可选）')}</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setParentOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-lg border border-ink/15 bg-surface px-4 py-2.5 text-left text-sm font-medium transition-colors hover:border-ink/30"
            >
              <FolderTree className="h-4 w-4 shrink-0 text-ink/60" />
              <span className={cn('flex-1 truncate', !parentSlug && 'text-ink/50')}>
                {parentSlug
                  ? findParentTitle(parents, parentSlug) ?? t('未知目录')
                  : t('不归类（作为根目录页面）')}
              </span>
            </button>

            {parentOpen && (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-ink/10 bg-surface p-1.5 shadow-hand">
                <button
                  type="button"
                  onClick={() => {
                    setParentSlug('');
                    setParentOpen(false);
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-ink/5',
                    !parentSlug && 'bg-ink/5'
                  )}
                >
                  {t('不归类（根目录）')}
                </button>
                {parents.map((node) => (
                  <ParentOption
                    key={node.id}
                    node={node}
                    depth={0}
                    selected={parentSlug}
                    onSelect={(s) => {
                      setParentSlug(s);
                      setParentOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 标签 */}
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
            {/* 编辑 / 预览切换（与发布帖子页一致） */}
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
            rows={12}
          />
        )}

        <p className="text-xs text-ink/50">
          {t('支持 Markdown 简版：# 标题 · **加粗** · *斜体* · - 列表 · &gt; 引用')}
        </p>
      </div>

      {/* 简介（可选）：展示在知识库目录树中 */}
      <div className="space-y-2">
        <label htmlFor="summary" className="text-sm font-bold">
          {t('简介（可选）')}
        </label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t('用一两句话说明这一页的价值，会展示在目录树中…')}
          rows={2}
          maxLength={120}
        />
      </div>

      {/* 隐私提示 */}
      <div className="rounded-xl border border-ink/10 bg-butter/40 p-4 text-sm leading-relaxed text-ink/80">
        💡 <span className="font-medium">{t('💡 撰写提示：')}</span>
        {t('知识库会长期展示并被多人查阅，请确保内容经过核对；涉及药物剂量与治疗方案请以医生意见为准，本社区不提供医疗建议。')}
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting} size="lg">
          <Send className="h-4 w-4" />
          {submitting ? t('发布中…') : mode === 'create' ? t('发布到知识库') : t('保存修改')}
        </Button>
      </div>
    </div>
  );
}

// 父级目录下拉选项（递归渲染子目录，缩进展示层级；选择的是节点的 slug）
function ParentOption({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: LibraryNode;
  depth: number;
  selected: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.slug)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-ink/5',
          selected === node.slug && 'bg-ink/5',
          depth > 0 && 'pl-6'
        )}
      >
        <FolderTree className="h-4 w-4 shrink-0 text-ink/60" />
        <span className="truncate">{node.title}</span>
      </button>
      {node.children.map((child) => (
        <ParentOption
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// 递归查找目录节点标题（用于下拉框显示所选父级）
function findParentTitle(nodes: LibraryNode[], slug: string): string | null {
  for (const node of nodes) {
    if (node.slug === slug) return node.title;
    const found = findParentTitle(node.children, slug);
    if (found) return found;
  }
  return null;
}
