// ============================================================
//  个人中心（组合多个真实接口）
// ============================================================
import { htmlToPlainText } from '@/lib/markdown';
import {
  api,
  AuthenticationError,
  nodeToLibraryNode,
  threadToPostListItem,
  type ApiRequestConfig,
  type StorydenCollection,
  type StorydenCollectionItem,
  type StorydenNode,
  type StorydenSession,
  type StorydenThread,
} from './shared';
import { fetchSession } from './auth';
import type { LibraryNode, PostListItem, Profile } from '@/types';

// 个人资料: 会话信息 + 我的帖子（?author=）+ 我的知识库（?author=）+ 我的收藏（Collections）
export async function fetchProfile(): Promise<Profile> {
  // 直接读 session 拿到 account（含 handle / bio / joined），未登录则抛错由页面引导登录
  const { data: session } = await api.get<StorydenSession>('/api/session');
  if (!session.account?.handle) throw new AuthenticationError();
  const account = session.account;
  const handle = session.account.handle;

  const [threadsRes, nodesRes, collectionsRes, draftsRes] = await Promise.all([
    api.get<{ threads: StorydenThread[] }>('/api/threads', { params: { author: handle } }),
    api.get<{ nodes: StorydenNode[] }>('/api/nodes', { params: { author: handle } }),
    api.get<{ collections: StorydenCollection[] }>('/api/collections'),
    // 我的草稿（StoryDen 草稿工作流：非管理员提交的知识库页面存为草稿）
    api.get<{ drafts: StorydenNode[] }>('/api/nodes/drafts').catch(() => ({ data: { drafts: [] } })),
  ]);

  const myThreads = (threadsRes.data.threads ?? []).map(threadToPostListItem);
  const myPages = (nodesRes.data.nodes ?? []).map(nodeToLibraryNode);
  const myDrafts = (draftsRes.data.drafts ?? []).map(nodeToLibraryNode);

  // 我的收藏：取自己拥有的收藏夹，逐个拉取其中的帖子与知识库页面
  // 真实 API 返回字段：items[{ item: { kind: 'post' | 'node', ref: {...} } }]
  const myCollections = (collectionsRes.data.collections ?? []).filter(
    (c) => c.owner?.handle === handle
  );
  const collectedPosts: PostListItem[] = [];
  const collectedPages: LibraryNode[] = [];
  // 并行拉取所有收藏夹内容（原来是串行 for 循环，收藏夹多时会逐个等待）
  const collectionItems = await Promise.all(
    myCollections.map(async (c) => {
      const mark = c.slug || c.id;
      const { data } = await api.get<{ items: StorydenCollectionItem[] }>(
        `/api/collections/${mark}`
      );
      return data.items ?? [];
    })
  );
  for (const items of collectionItems) {
    for (const item of items) {
      const ref = item.item?.ref;
      if (!ref) continue;
      if (item.item?.kind === 'post') {
        const t = ref as StorydenThread;
        if (!collectedPosts.some((p) => p.id === t.id)) {
          collectedPosts.push({ ...threadToPostListItem(t), is_collected: true });
        }
      } else if (item.item?.kind === 'node') {
        const n = ref as StorydenNode;
        if (!collectedPages.some((p) => p.id === n.id)) {
          collectedPages.push(nodeToLibraryNode(n));
        }
      }
    }
  }

  return {
    user: {
      id: account.id,
      name: account.name || handle,
      avatar: `/api/accounts/${encodeURIComponent(handle)}/avatar`,
      // 真实 API 返回字段：joined（注册时间），对应 Mock 的 joined_at
      joined_at: account.joined ?? '',
      // 真实 API 返回字段：bio（HTML），对应 Mock 的 bio（纯文本）
      bio: account.bio ? htmlToPlainText(account.bio) : '',
      posts: myThreads,
      library_pages: myPages,
      drafts: myDrafts,
      collections: { posts: collectedPosts, library_pages: collectedPages },
    },
  };
}

// 上传头像: POST /api/accounts/self/avatar（application/octet-stream 原始图片字节）
// 头像访问路径：GET /api/accounts/{handle}/avatar
export async function uploadAvatar(file: File): Promise<string> {
  await api.post('/api/accounts/self/avatar', await file.arrayBuffer(), {
    headers: { 'Content-Type': 'application/octet-stream' },
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  // 获取新头像 URL；网络错误时返回空（上传已成功，不因取 URL 失败让页面整体报错）
  try {
    const session = await fetchSession();
    return session?.user?.avatar ?? '';
  } catch {
    return '';
  }
}

// 更新个人简介: PATCH /api/accounts/{account_id}（bio 为 HTML）
// 注意：当前 StoryDen 版本对浏览器会话可能拒绝该接口（403），调用方做内联提示
export async function updateBio(bio: string, accountId: string): Promise<void> {
  const escaped = bio.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await api.patch(
    `/api/accounts/${encodeURIComponent(accountId)}`,
    { bio: `<body><p>${escaped}</p></body>` },
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}
