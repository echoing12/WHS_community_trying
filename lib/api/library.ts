// ============================================================
//  知识库（StoryDen 真实资源名：node）
// ============================================================
import { markdownToHtml } from '@/lib/markdown';
import { api, nodeToLibraryNode, PermissionDeniedError, type StorydenNode } from './shared';
import type { CreateLibraryPageInput, LibraryNode } from '@/types';

// 知识库目录树: GET /api/nodes（返回带 children 的树）
export async function fetchLibraryTree(): Promise<LibraryNode[]> {
  const { data } = await api.get<{ nodes: StorydenNode[] }>('/api/nodes');
  return (data.nodes ?? []).map(nodeToLibraryNode);
}

// 知识库页面详情: GET /api/nodes/{slug}
export async function fetchLibraryPage(slug: string): Promise<LibraryNode> {
  const { data } = await api.get<StorydenNode>(`/api/nodes/${encodeURIComponent(slug)}`);
  return nodeToLibraryNode(data);
}

// 创建知识库页面: POST /api/nodes
// 真实 API 请求体：name / content（HTML）/ description / parent（父级 slug）/ visibility。
// 注意：StoryDen 仅管理员可发布（published）节点，普通成员会收到 403，
// 此时降级为 draft（草稿仅自己可见），由创建页提示用户等待管理员审核。
export async function createLibraryPage(
  input: CreateLibraryPageInput
): Promise<{ slug: string; draft: boolean }> {
  const payload = {
    name: input.title,
    // 真实 API 返回字段为 content（HTML 富文本），对应 Mock 的 content（Markdown）
    content: markdownToHtml(input.content),
    description: input.summary ?? '',
    tags: input.tags,
    ...(input.parent_slug ? { parent: input.parent_slug } : {}),
    visibility: 'published',
  };
  try {
    const { data } = await api.post<StorydenNode>('/api/nodes', payload);
    return { slug: data.slug, draft: false };
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      // 非管理员：降级为草稿提交
      const { data } = await api.post<StorydenNode>('/api/nodes', { ...payload, visibility: 'draft' });
      return { slug: data.slug, draft: true };
    }
    throw err;
  }
}

// 编辑知识库页面: PATCH /api/nodes/{slug}（作者本人或管理员；body 传 HTML）
export async function updateLibraryPage(
  slug: string,
  input: CreateLibraryPageInput
): Promise<LibraryNode> {
  const { data } = await api.patch<StorydenNode>(`/api/nodes/${encodeURIComponent(slug)}`, {
    name: input.title,
    content: markdownToHtml(input.content),
    description: input.summary ?? '',
    tags: input.tags,
    ...(input.parent_slug ? { parent: input.parent_slug } : {}),
  });
  return nodeToLibraryNode(data);
}

// 删除知识库页面: DELETE /api/nodes/{slug}（作者本人或管理员）
export async function deleteLibraryPage(slug: string): Promise<void> {
  await api.delete(`/api/nodes/${encodeURIComponent(slug)}`);
}

// 我的草稿列表: GET /api/nodes/drafts（StoryDen 的草稿工作流：非管理员提交的知识库页面）
export async function fetchDrafts(): Promise<LibraryNode[]> {
  const { data } = await api.get<{ drafts: StorydenNode[] }>('/api/nodes/drafts');
  return (data.drafts ?? []).map(nodeToLibraryNode);
}

// 正文文件上传（图片 / 视频 / PDF / Word / Excel / TXT 等任意文件）: POST /api/assets?filename=（application/octet-stream）
// StoryDen 按文件魔数识别 MIME（无类型白名单），返回的 path（如 /api/assets/{filename}）
// 可直接用于 markdown：图片/视频用 ![](path)，文档用 [📄 文件名](<path>)；访客可读（AssetGet 无鉴权）
// 注意：后端会把文件名 slugify（去掉扩展名），视频的识别与文档的下载名由
// MarkdownView 分别依据 alt（原始文件名）和 download 属性补全
export async function uploadAsset(file: File): Promise<{ path: string; filename: string }> {
  const { data } = await api.post<{ path: string; filename: string }>(
    '/api/assets',
    await file.arrayBuffer(),
    {
      headers: { 'Content-Type': 'application/octet-stream' },
      params: { filename: file.name },
      // 文件上传单独放宽超时：全局 20s 对稍大的 PDF / 视频等大文件不够（仅本请求生效）
      timeout: 300_000,
    }
  );
  return { path: data.path, filename: data.filename };
}
