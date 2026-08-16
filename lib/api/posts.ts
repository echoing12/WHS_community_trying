// ============================================================
//  帖子（StoryDen 真实资源名：thread）
// ============================================================
import { markdownToHtml } from '@/lib/markdown';
import { api, threadToPostDetail, threadToPostListItem, type StorydenCategory, type StorydenThread } from './shared';
import type { CategoryItem, CreatePostInput, PostDetail, PostListItem } from '@/types';

// 帖子列表分页结果（PaginatedResult + threads）
export interface PostListResult {
  threads: PostListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

// 帖子列表: GET /api/threads（支持 ?page= 分页 / ?q= 搜索 / ?author= 作者 / ?tags= 标签筛选）
export async function fetchPosts(
  params: { page?: number; pageSize?: number } = {}
): Promise<PostListResult> {
  const { page = 1, pageSize = 20 } = params;
  const { data } = await api.get<{
    threads: StorydenThread[];
    results?: number;
    total_pages?: number;
    current_page?: number;
  }>('/api/threads', { params: { page, page_size: pageSize } });
  return {
    threads: (data.threads ?? []).map(threadToPostListItem),
    total: data.results ?? (data.threads ?? []).length,
    totalPages: data.total_pages ?? 1,
    currentPage: data.current_page ?? page,
  };
}

// 帖子详情: GET /api/threads/{id}（响应含 replies 扁平评论列表）
export async function fetchPostDetail(id: string): Promise<PostDetail> {
  const { data } = await api.get<StorydenThread>(`/api/threads/${id}`);
  return threadToPostDetail(data);
}

// 创建帖子: POST /api/threads
// 真实 API 请求体：title / body（HTML）/ tags / category（分类 id）/ visibility ——
// visibility 必须显式传 published，否则默认为 draft 不出现在列表
export async function createPost(input: CreatePostInput): Promise<{ id: string }> {
  const { data } = await api.post<StorydenThread>('/api/threads', {
    title: input.title,
    // 真实 API 返回字段为 body（HTML 富文本），对应 Mock 的 content（Markdown）：
    // 前端先转成 HTML 再提交，服务端才能正确解析块结构
    body: markdownToHtml(input.content),
    tags: input.tags,
    ...(input.category_id ? { category: input.category_id } : {}),
    visibility: 'published',
  });
  return { id: data.id };
}

// 编辑帖子: PATCH /api/threads/{id}（作者本人或管理员）
// 真实 API 请求体同创建；body 传 HTML
export async function updatePost(id: string, input: CreatePostInput): Promise<PostDetail> {
  const { data } = await api.patch<StorydenThread>(`/api/threads/${id}`, {
    title: input.title,
    body: markdownToHtml(input.content),
    tags: input.tags,
    ...(input.category_id ? { category: input.category_id } : {}),
  });
  return threadToPostDetail(data);
}

// 删除帖子: DELETE /api/threads/{id}（作者本人或管理员）
export async function deletePost(id: string): Promise<void> {
  await api.delete(`/api/threads/${id}`);
}

// 分类列表: GET /api/categories
export async function fetchCategories(): Promise<CategoryItem[]> {
  const { data } = await api.get<{ categories: StorydenCategory[] }>('/api/categories');
  return (data.categories ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    colour: c.colour,
    postCount: c.postCount,
  }));
}

// 发表评论: POST /api/threads/{id}/replies（body 为 HTML；reply_to 用于嵌套回复）
export async function createReply(
  threadId: string,
  content: string,
  replyTo?: string
): Promise<void> {
  await api.post(`/api/threads/${threadId}/replies`, {
    body: markdownToHtml(content),
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
}

// 帖子点赞: PUT 点赞 / DELETE 取消（StoryDen: /api/likes/posts/{post_id}）
export async function togglePostLike(id: string, liked: boolean): Promise<void> {
  if (liked) {
    await api.put(`/api/likes/posts/${id}`);
  } else {
    await api.delete(`/api/likes/posts/${id}`);
  }
}
