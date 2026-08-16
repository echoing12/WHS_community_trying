// ============================================================
//  标签（StoryDen 真实资源名：tag）
// ============================================================
import {
  api,
  linkToLinkItem,
  nodeToLibraryNode,
  threadToPostListItem,
  type StorydenNode,
  type StorydenTag,
  type StorydenTagItem,
  type StorydenThread,
  type StorydenLink,
} from './shared';
import type { PostListItem, TagDetail, TagItem } from '@/types';

// 标签列表: GET /api/tags
// 真实 API 返回字段：name / item_count（对应 Mock 的 count）；
// StoryDen 不区分帖子/知识库/链接的计数，posts_count 等统一为 0（页面按需隐藏）
export async function fetchTags(): Promise<TagItem[]> {
  const { data } = await api.get<{ tags: StorydenTag[] }>('/api/tags');
  return (data.tags ?? []).map((t) => ({
    name: t.name,
    count: t.item_count ?? 0,
    posts_count: 0,
    library_count: 0,
    links_count: 0,
  }));
}

// 标签详情: GET /api/tags/{name} —— 聚合该标签下的帖子 / 知识库页面 / 链接
// 真实 API 返回字段：items[{ kind: 'thread' | 'node' | 'link', ref: {...} }]
export async function fetchTagDetail(name: string): Promise<TagDetail> {
  const { data } = await api.get<{ name: string; item_count?: number; items?: StorydenTagItem[] }>(
    `/api/tags/${encodeURIComponent(name)}`
  );
  const items = data.items ?? [];
  return {
    tag: {
      name: data.name,
      count: data.item_count ?? 0,
      posts_count: 0,
      library_count: 0,
      links_count: 0,
    },
    posts: items.filter((i) => i.kind === 'thread').map((i) => threadToPostListItem(i.ref as StorydenThread)),
    library_pages: items.filter((i) => i.kind === 'node').map((i) => nodeToLibraryNode(i.ref as StorydenNode)),
    links: items.filter((i) => i.kind === 'link').map((i) => linkToLinkItem(i.ref as StorydenLink)),
  };
}

// 按标签拉取帖子（首页标签筛选用）: GET /api/tags/{name} 的 items 中 kind=thread 的部分
export async function fetchPostsByTag(name: string): Promise<PostListItem[]> {
  const detail = await fetchTagDetail(name);
  return detail.posts;
}
