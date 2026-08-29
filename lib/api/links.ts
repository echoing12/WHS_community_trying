// ============================================================
//  链接（StoryDen 真实资源名：link）
// ============================================================
import { api, extractDomain, linkToLinkItem, type StorydenLink } from './shared';
import type { LinkItem, SubmitLinkInput } from '@/types';
import { tr } from '@/lib/i18n';

// 链接列表: GET /api/links
export async function fetchLinks(): Promise<LinkItem[]> {
  const { data } = await api.get<{ links: StorydenLink[] }>('/api/links');
  return (data.links ?? []).map(linkToLinkItem);
}

// 提交链接: POST /api/links（服务端会抓取 URL 的 OG 元数据，耗时约数秒，axios 超时已放宽）
// 真实 API 请求体仅 url / title / description；StoryDen 的链接没有标签（tags）字段
export async function submitLink(input: SubmitLinkInput): Promise<{ id: string }> {
  const { data } = await api.post<StorydenLink>('/api/links', {
    url: input.url,
    title: input.title,
    description: input.description,
  });
  return { id: data.id ?? data.slug };
}

// 抓取链接元数据（提交前预览）
// 注意：StoryDen 没有独立的链接元数据抓取接口（元数据在 POST /api/links 时由服务端抓取），
// 这里退化为本地校验 URL 并提取域名，标题/描述由用户手动填写或提交后由服务端抓取
export async function fetchLinkMetadata(url: string): Promise<LinkItem> {
  const domain = extractDomain(url);
  return {
    id: `preview-${Date.now()}`,
    slug: '',
    url,
    title: domain,
    description: tr('提交后由服务端自动抓取网页标题与描述（OG 信息）。'),
    image: '',
    domain,
    author: { name: tr('我'), avatar: '' },
    created_at: '',
    tags: [],
    like_count: 0,
    is_liked: false,
  };
}
