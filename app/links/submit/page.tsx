'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LinkIcon, Loader2, Search, Send } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import TagPicker from '@/components/TagPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchLinkMetadata, submitLink } from '@/lib/api';
import type { LinkItem } from '@/types';

export default function SubmitLinkPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<LinkItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 抓取链接元数据（提交前预览）
  // 注意：StoryDen 没有独立的元数据抓取接口（元数据在 POST /api/links 时由服务端自动抓取），
  // 这里退化为本地校验 URL 并提取域名；标题/描述可手动填写，也可留空由服务端抓取
  const fetchMetadata = async () => {
    if (!url.trim()) {
      setError('请输入链接地址哦');
      return;
    }
    // 简单校验：必须以 http:// 或 https:// 开头
    if (!/^https?:\/\//i.test(url.trim())) {
      setError('链接地址需要以 http:// 或 https:// 开头');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const meta = await fetchLinkMetadata(url.trim());
      setMetadata(meta);
      setTitle(meta.title);
      setDescription(meta.description);
      setFetching(false);
    } catch {
      setError('链接格式有误，请确认后重试，或手动填写标题与描述');
      setFetching(false);
    }
  };

  const submit = async () => {
    if (!url.trim()) {
      setError('请输入链接地址哦');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // 真实 API：POST /api/links（服务端会抓取 OG 元数据，响应耗时约数秒）
      await submitLink({
        url: (metadata?.url ?? url).trim(),
        title: title.trim(),
        description: description.trim(),
        tags,
      });
      router.push('/links');
    } catch {
      // 基于Storyden官方规格: 401/403/400 已由 axios 拦截器统一弹窗处理，这里不重复提示
      setSubmitting(false);
    }
  };

  // 基于Storyden官方规格: 需要登录的路由由 AuthGuard 客户端校验（middleware 服务端首道拦截）
  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="hand-title text-2xl text-ink lg:text-3xl">🔗 提交链接</h1>
        <p className="mt-2 text-sm text-ink/60">
          粘贴网址，提交后由服务端自动抓取标题与描述。请只分享与 WHS 家庭相关的、内容可靠的资料。
        </p>
      </div>

      <div className="hand-card space-y-5 p-6 lg:p-8">
        {/* 第一步：输入 URL */}
        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-bold">
            链接地址 <span className="text-ink/40">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" />
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/article"
                className="pl-11"
                onKeyDown={(e) => e.key === 'Enter' && fetchMetadata()}
              />
            </div>
            <Button onClick={fetchMetadata} disabled={fetching} className="sm:w-auto">
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {fetching ? '检查中…' : '检查链接'}
            </Button>
          </div>
        </div>

        {/* 第二步：编辑元数据 */}
        {metadata && (
          <div className="space-y-4 border-t-2 border-dashed border-ink/20 pt-5">
            {/* 预览卡片 */}
            <div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-ink/40 bg-surface/60 p-4">
              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink/50 bg-butter/60">
                {metadata.image ? (
                  <img
                    src={metadata.image}
                    alt={metadata.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="hand-title text-2xl text-ink/70">
                    {metadata.domain[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{metadata.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink/60">{metadata.description}</p>
                <p className="mt-1 text-xs font-medium text-ink/40">{metadata.domain}</p>
              </div>
            </div>

            {/* 标题（可编辑） */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold">
                标题（可编辑）
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="不填写则由服务端自动抓取标题"
                maxLength={80}
              />
            </div>

            {/* 描述（可编辑） */}
            <div className="space-y-2">
              <label htmlFor="desc" className="text-sm font-bold">
                描述（可编辑）
              </label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="不填写则由服务端自动抓取描述…"
                rows={3}
                maxLength={200}
                className="w-full rounded-2xl border-2 border-dashed border-ink/60 bg-surface px-4 py-3 text-sm font-medium placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-butter"
              />
            </div>

            {/* 标签（真实 API 的 Link 无标签字段，此处仅为界面兼容保留，提交时不传） */}
            <div className="space-y-2">
              <label className="text-sm font-bold">标签（可多选）</label>
              <TagPicker value={tags} onChange={setTags} />
              <p className="text-xs text-ink/50">
                提示：StoryDen 的链接暂不支持标签，标签选择仅作界面兼容
              </p>
            </div>
          </div>
        )}

        {/* 提交提示 */}
        <div className="rounded-2xl border-2 border-dashed border-butter bg-butter/30 p-4 text-sm leading-relaxed text-ink/80">
          💡 <span className="font-bold">分享提示：</span>请勿分享需要付费订阅或包含个人隐私信息的
          链接；涉及医疗内容的资料请优先选择权威机构（医院、基金会、专业学会）发布的来源。
        </div>

        {error && <p className="text-sm font-bold text-red-500">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting} size="lg">
            <Send className="h-4 w-4" />
            {submitting ? '提交中…' : '提交链接'}
          </Button>
        </div>
      </div>

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        本社区仅供 WHS 患者交流，不构成医疗建议；链接内容来自第三方网站，请自行甄别
      </p>
    </div>
    </AuthGuard>
  );
}
