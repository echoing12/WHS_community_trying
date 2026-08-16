// ============================================================
//  收藏夹（StoryDen Collection 资源）
// ============================================================
import {
  api,
  nodeToLibraryNode,
  threadToPostListItem,
  type StorydenCollection,
  type StorydenCollectionItem,
  type StorydenNode,
  type StorydenSession,
  type StorydenThread,
} from './shared';
import type { LibraryNode, PostListItem } from '@/types';

export interface CollectionItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  item_count: number;
  created_at: string;
}

// 收藏帖子的「我的收藏」目录（StoryDen Collection）的 mark，模块级缓存避免重复请求
let myCollectionMark: string | null = null;
let myAccountHandle: string | null = null;

// 获取当前用户的 handle（GET /api/session 的 account.handle，模块级缓存）
async function getMyHandle(): Promise<string | null> {
  if (myAccountHandle) return myAccountHandle;
  try {
    const { data } = await api.get<StorydenSession>('/api/session');
    myAccountHandle = data.account?.handle ?? null;
  } catch {
    myAccountHandle = null;
  }
  return myAccountHandle;
}

// 获取当前用户的收藏目录 mark：
// GET /api/collections 列出（全站）收藏夹，优先复用自己创建的「我的收藏」；
// 若还没有，POST /api/collections 创建一个名为「我的收藏」的收藏夹。
async function ensureCollectionMark(): Promise<string> {
  if (myCollectionMark) return myCollectionMark;
  const myHandle = await getMyHandle();
  const { data } = await api.get<{ collections: StorydenCollection[] }>('/api/collections');
  const all = data.collections ?? [];
  const mine = myHandle ? all.filter((c) => c.owner?.handle === myHandle) : [];
  const picked = mine.find((c) => c.name === '我的收藏') ?? mine[0] ?? all[0];
  if (picked) {
    myCollectionMark = picked.slug || picked.id;
    return myCollectionMark;
  }
  const created = await api.post<StorydenCollection>('/api/collections', { name: '我的收藏' });
  myCollectionMark = created.data.slug || created.data.id;
  return myCollectionMark;
}

// 帖子收藏: PUT 加入收藏夹 / DELETE 移出（StoryDen: /api/collections/{mark}/posts/{post_id}）
// mark 可选：不传时使用「我的收藏」默认收藏夹（首次自动创建）
export async function togglePostBookmark(id: string, collected: boolean, mark?: string): Promise<void> {
  const target = mark ?? (await ensureCollectionMark());
  if (collected) {
    await api.put(`/api/collections/${target}/posts/${id}`);
  } else {
    await api.delete(`/api/collections/${target}/posts/${id}`);
  }
}

// 知识库节点收藏: PUT 加入收藏夹 / DELETE 移出（StoryDen: /api/collections/{mark}/nodes/{node_id}）
export async function toggleNodeBookmark(id: string, collected: boolean, mark?: string): Promise<void> {
  const target = mark ?? (await ensureCollectionMark());
  if (collected) {
    await api.put(`/api/collections/${target}/nodes/${id}`);
  } else {
    await api.delete(`/api/collections/${target}/nodes/${id}`);
  }
}

// 我的收藏夹列表: GET /api/collections（全站收藏夹，过滤出自己拥有的）
export async function fetchMyCollections(): Promise<CollectionItem[]> {
  const myHandle = await getMyHandle();
  const { data } = await api.get<{ collections: StorydenCollection[] }>('/api/collections');
  return (data.collections ?? [])
    .filter((c) => c.owner?.handle === myHandle)
    .map((c) => ({
      id: c.id,
      slug: c.slug ?? c.id,
      name: c.name,
      description: c.description,
      item_count: c.item_count ?? 0,
      created_at: c.createdAt ?? '',
    }));
}

// 新建收藏夹: POST /api/collections
export async function createCollection(name: string, description?: string): Promise<CollectionItem> {
  const { data } = await api.post<StorydenCollection>('/api/collections', {
    name,
    ...(description ? { description } : {}),
  });
  myCollectionMark = null; // 默认收藏夹缓存失效
  return {
    id: data.id,
    slug: data.slug ?? data.id,
    name: data.name,
    description: data.description,
    item_count: 0,
    created_at: data.createdAt ?? '',
  };
}

// 编辑收藏夹（改名 / 改描述）: PATCH /api/collections/{mark}
export async function updateCollection(
  mark: string,
  input: { name?: string; description?: string }
): Promise<void> {
  await api.patch(`/api/collections/${encodeURIComponent(mark)}`, input);
}

// 删除收藏夹: DELETE /api/collections/{mark}
export async function deleteCollection(mark: string): Promise<void> {
  await api.delete(`/api/collections/${encodeURIComponent(mark)}`);
  myCollectionMark = null;
}

// 收藏夹内容: GET /api/collections/{mark}
// 真实 API 返回 items[{ item: { kind: 'post' | 'node', ref } }]
export async function fetchCollectionItems(
  mark: string
): Promise<{ posts: PostListItem[]; library_pages: LibraryNode[] }> {
  const { data } = await api.get<{ items: StorydenCollectionItem[] }>(`/api/collections/${encodeURIComponent(mark)}`);
  const posts: PostListItem[] = [];
  const library_pages: LibraryNode[] = [];
  for (const item of data.items ?? []) {
    const ref = item.item?.ref;
    if (!ref) continue;
    if (item.item?.kind === 'post') {
      posts.push({ ...threadToPostListItem(ref as StorydenThread), is_collected: true });
    } else if (item.item?.kind === 'node') {
      library_pages.push(nodeToLibraryNode(ref as StorydenNode));
    }
  }
  return { posts, library_pages };
}
