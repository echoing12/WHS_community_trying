import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { htmlToMarkdown, htmlToPlainText, markdownToHtml } from './markdown';
import type {
  AuthResponse,
  CategoryItem,
  CreateLibraryPageInput,
  CreatePostInput,
  LibraryNode,
  LinkItem,
  LoginInput,
  Member,
  MembersResponse,
  PostDetail,
  PostListItem,
  Profile,
  RegisterInput,
  SessionResponse,
  SubmitLinkInput,
  TagDetail,
  TagItem,
  User,
} from '@/types';

// ============================================================
//  环境适配（生产环境兼容）
// ============================================================
// 是否生产构建（next build / npm start 时 Next 会内联该值）
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// API 基础路径：默认 '/'（相对路径）——
// 开发环境由 next.config.mjs 的 rewrites 代理到本地 StoryDen；
// 生产环境由 Nginx 反向代理 /api/* 到 StoryDen 后端。
// 严禁硬编码域名或端口，NEXT_PUBLIC_API_URL 仅作为可选的覆盖项。
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/';

// ============ 错误类型（基于Storyden官方规格 @storyden/api） ============
// 401 → AuthenticationError（未认证 / 会话无效）
// 403 → PermissionDeniedError（已认证但权限不足）
// 400 → BadRequestError（请求参数错误）
export class AuthenticationError extends Error {
  constructor(message = '未认证或会话已失效') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = '权限不足') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class BadRequestError extends Error {
  constructor(message = '请求参数错误') {
    super(message);
    this.name = 'BadRequestError';
  }
}

// 429 Too Many Requests: 代理层（Caddy/Nginx）或后端限流命中
// （连续登录失败 / 注册过于频繁），由 AuthForm 内联提示，不弹全局窗
export class RateLimitError extends Error {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ============ axios 实例 ============
// 基于Storyden官方规格:
// - Storyden 使用基于 Cookie 的 Session 认证，Cookie 名为 storyden-session（注意是连字符）
// - withCredentials: true 让浏览器自动携带该 Cookie
// - Web 前端不做 Authorization Bearer 注入（那是程序化 Access Key 的用法）
// 生产环境兼容: 相对路径 + withCredentials 同源传输，Nginx 代理后无需任何代码改动
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 自定义请求配置：skipGlobalHandling = true 时跳过全局弹窗/跳转，由调用方自行处理错误
interface ApiRequestConfig extends InternalAxiosRequestConfig {
  skipGlobalHandling?: boolean;
}

// 基于Storyden官方规格: 响应拦截器统一处理 401 / 403 / 400
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const skip = (error.config as ApiRequestConfig | undefined)?.skipGlobalHandling === true;
    // 认证相关接口（signin/signup/logout/session）返回 401 是正常业务状态
    // （如登录失败、未登录），由调用方内联处理，不触发全局「登录已过期」弹窗与跳转
    const isAuthEndpoint = url.includes('/api/auth/');

    if (status === 401 && !isAuthEndpoint) {
      // AuthenticationError: 未认证 / 会话过期 → 清理本地状态并跳转登录页（携带当前路径）
      clearLocalSession();
      if (!skip && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.alert('登录已过期，请重新登录');
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?redirect=${redirect}`;
      }
      return Promise.reject(new AuthenticationError());
    }

    if (status === 401 && isAuthEndpoint) {
      // 登录/注册接口的 401：账号或密码错误（如 signin 凭证无效）
      return Promise.reject(new AuthenticationError('账号或密码错误，请重试'));
    }

    if (status === 404 && isAuthEndpoint) {
      // 登录接口的 404：Storyden 对不存在的账号返回 404 —— 必须与 401 统一文案，
      // 否则会把「账号不存在」暴露给攻击者（账号枚举）
      return Promise.reject(new AuthenticationError('账号或密码错误，请重试'));
    }

    if (status === 429) {
      // 429 Too Many Requests: 代理层限流（Caddy/Nginx rate_limit）或后端限流命中
      return Promise.reject(new RateLimitError());
    }

    if ((status === 400 || status === 409) && isAuthEndpoint) {
      // 登录/注册接口的 400/409：凭证校验失败（错误密码 / 登录名格式 / 密码太短 / 登录名被占用等），
      // 不弹全局提示，携带后端 detail 由表单内联映射为中文提示
      return Promise.reject(new BadRequestError(extractErrorMessage(error)));
    }

    if (status === 403) {
      // PermissionDeniedError: 已登录但权限不足；skipGlobalHandling 时由调用方内联提示
      if (!skip) window.alert('您没有权限执行此操作');
      return Promise.reject(new PermissionDeniedError());
    }

    if (status === 400) {
      // BadRequestError: 显示具体错误信息（认证接口不弹全局提示，由表单内联展示）
      // 生产环境兼容: 生产构建不暴露后端技术细节，统一为友好提示
      const message = isAuthEndpoint || skip ? '' : (IS_PRODUCTION ? '' : extractErrorMessage(error));
      if (!isAuthEndpoint && !skip) window.alert(message || '请求参数有误，请检查后重试');
      return Promise.reject(new BadRequestError(message));
    }

    // 其余状态码（404/409/422/429/5xx 等）：转成带状态码的 Error，
    // 让页面能显示具体原因而不是一律显示「网络异常」
    const detail = extractErrorMessage(error);
    return Promise.reject(new Error(`请求失败（HTTP ${status}）${detail ? `：${detail}` : ''}`));
  }
);

// 清除本地会话状态：Cookie 会话模式下后端 Set-Cookie 下发的 storyden-session
// 只能由服务端注销或过期失效，这里清理的是本地残留的旧版 cookie
function clearLocalSession() {
  Cookies.remove('storyden_session');
  Cookies.remove('storyden-session');
  Cookies.remove('user_name');
  Cookies.remove('token');
}

// 从后端错误响应中提取可读的错误信息（兼容 message / error / error_message / detail 等常见字段）
function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return '';
  for (const key of ['message', 'error', 'error_message', 'detail']) {
    const value = data[key];
    if (typeof value === 'string' && value) return value;
    if (typeof value === 'object' && value !== null) {
      const nested = (value as Record<string, unknown>).message;
      if (typeof nested === 'string' && nested) return nested;
    }
  }
  return '';
}

// ============================================================
//  真实 StoryDen API 字段适配辅助
// ============================================================
// StoryDen（v1.26）真实资源名与本站页面的对应关系：
//   帖子 thread  ←→  页面里的帖子（列表/详情/评论）
//   知识库 node  ←→  页面里的知识库页面
//   链接 link    ←→  链接分享
//   成员 profile ←→  成员列表

// StoryDen 的 tags 字段可能是字符串数组，也可能是 TagReference 对象数组（{name, colour, ...}）
function tagNames(tags: Array<string | { name?: string }> | undefined | null): string[] {
  return (tags ?? []).map((t) => (typeof t === 'string' ? t : t?.name ?? '')).filter(Boolean);
}

// Account（会话/作者）→ 前端 User
// 真实 API 返回字段为 handle / name / bio（HTML）/ joined / admin，
// 对应本站的 name / avatar / bio / joined_at / role
function userFromAccount(acc: StorydenAccount | undefined): User {
  return {
    name: acc?.name || acc?.handle || '未知用户',
    // 头像 URL：StoryDen 账号头像固定路径 /api/accounts/{handle}/avatar
    avatar: acc?.handle ? `/api/accounts/${encodeURIComponent(acc.handle)}/avatar` : '',
    bio: acc?.bio ? htmlToPlainText(acc.bio) : '',
    // handle 用于「是否我自己的内容」判断（编辑/删除按钮显示）
    handle: acc?.handle,
    // 角色映射：基于Storyden官方规格 Account.admin（布尔，GET /api/session 会话响应携带），
    // 管理员可管理任意内容（编辑/删除他人帖子与知识库页面）
    role: acc?.admin ? 'admin' : 'member',
  };
}

// StoryDen Thread → 帖子列表项
// 真实 API 返回字段：createdAt/likes.likes/likes.liked/collections.has_collected/
// reply_status.replies/pinned（0 或 1），对应 Mock 的 created_at/like_count/is_liked/is_collected/reply_count/is_pinned
function threadToPostListItem(t: StorydenThread): PostListItem {
  return {
    id: t.id,
    title: t.title,
    author: userFromAccount(t.author),
    created_at: t.createdAt,
    reply_count: t.reply_status?.replies ?? 0,
    tags: tagNames(t.tags),
    like_count: t.likes?.likes ?? 0,
    is_liked: t.likes?.liked ?? false,
    is_collected: t.collections?.has_collected ?? false,
    is_pinned: (t.pinned ?? 0) > 0,
    category: t.category ? { id: t.category.id, name: t.category.name, slug: t.category.slug } : null,
  };
}

// StoryDen Thread → 帖子详情（正文 HTML → Markdown；评论扁平列表 → 嵌套树）
// 真实 API 返回字段：body（HTML 正文，对应 Mock 的 content）、replies.replies（评论扁平数组，
// 通过 reply_to 字段指向父评论 id），author.bio 为 HTML
function threadToPostDetail(t: StorydenThread): PostDetail {
  const flatReplies = t.replies?.replies ?? [];
  const byId = new Map<string, StorydenReply>();
  for (const r of flatReplies) byId.set(r.id, r);
  const childrenOf = (parentId: string) =>
    flatReplies
      .filter((r) => r.reply_to === parentId)
      .map((r) => replyToComment(r, childrenOf));

  const replyToComment = (r: StorydenReply, nested: (id: string) => CommentItem[]): CommentItem => ({
    id: r.id,
    // 真实 API 返回字段：author.name（对象），对应 Mock 的 author（字符串昵称）
    author: r.author?.name || '未知用户',
    // 真实 API 返回字段：body（HTML），对应 Mock 的 content（纯文本）
    content: htmlToPlainText(r.body),
    created_at: r.createdAt,
    replies: nested(r.id),
  });

  return {
    id: t.id,
    title: t.title,
    // 真实 API 返回字段：body（HTML），对应 Mock 的 content（Markdown）
    content: htmlToMarkdown(t.body),
    author: userFromAccount(t.author),
    created_at: t.createdAt,
    reply_count: t.reply_status?.replies ?? 0,
    replies: flatReplies.filter((r) => !r.reply_to).map((r) => replyToComment(r, childrenOf)),
    tags: tagNames(t.tags),
    like_count: t.likes?.likes ?? 0,
    is_liked: t.likes?.liked ?? false,
    is_collected: t.collections?.has_collected ?? false,
    is_pinned: (t.pinned ?? 0) > 0,
    category: t.category ? { id: t.category.id, name: t.category.name, slug: t.category.slug } : null,
  };
}

// StoryDen Node → 知识库页面
// 真实 API 返回字段：name（对应 title）、description（对应 summary）、content（HTML，对应 Mock 的 Markdown）、
// owner（对应 author）、createdAt/updatedAt、parent（对象，对应 Mock 的 parent_id）
function nodeToLibraryNode(n: StorydenNode): LibraryNode {
  return {
    id: n.id,
    slug: n.slug,
    title: n.name,
    content: htmlToMarkdown(n.content),
    summary: n.description ?? '',
    author: userFromAccount(n.owner),
    created_at: n.createdAt,
    updated_at: n.updatedAt,
    tags: tagNames(n.tags),
    parent_id: n.parent?.slug ?? null,
    children: (n.children ?? []).map(nodeToLibraryNode),
    // 真实 API 无节点点赞/收藏计数（likes 仅支持帖子），统一为 false / 0
    like_count: 0,
    is_liked: false,
    is_collected: false,
  };
}

// StoryDen Link → 链接分享项
// 真实 API 返回字段：slug/url/title/description/domain/primary_image（Asset），
// 无 author/created_at/tags/like_count —— 页面按可选字段适配展示
function linkToLinkItem(l: StorydenLink): LinkItem {
  return {
    id: l.id ?? l.slug,
    slug: l.slug,
    url: l.url,
    title: l.title ?? extractDomain(l.url),
    description: l.description ?? '',
    image: l.primary_image?.path ?? l.favicon_image?.path ?? '',
    domain: l.domain ?? extractDomain(l.url),
    author: { name: '社区成员', avatar: '' },
    created_at: '',
    tags: [],
    like_count: 0,
    is_liked: false,
  };
}

// StoryDen PublicProfile → 成员
// 真实 API 返回字段：handle/id/name/joined/bio/followers/following/interests/links，
// 无头像字段（用姓名首字占位头像）
// 注意：deletedAt（封禁时间）只在详情接口（GET /api/profiles/{handle}）返回，
// 列表接口（GET /api/profiles）不带该字段 —— 成员列表的封禁过滤须由管理员接口补足
function profileToMember(p: StorydenProfile): Member {
  return {
    id: p.handle ?? p.id,
    name: p.name || p.handle || '未知用户',
    avatar: '',
    joined_at: p.joined ?? p.createdAt ?? '',
    bio: p.bio ? htmlToPlainText(p.bio) : '',
    followers: p.followers ?? 0,
    following: p.following ?? 0,
    // 兴趣标签：真实 API 字段 interests（TagReference 对象数组 → 名称）
    interests: (p.interests ?? []).map((t) => (typeof t === 'string' ? t : t.name ?? '')).filter(Boolean),
    // 主页外部链接：真实 API 字段 links（{text, url} 数组）
    links: (p.links ?? []).map((l) => ({ text: l.text ?? l.url, url: l.url })),
    // 封禁时间（仅详情接口返回；有值 = 已被移出社区/临时封禁中）
    deleted_at: p.deletedAt,
  };
}

// 从 URL 提取域名（www.example.com/path → example.com）
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ============================================================
//  认证（StoryDen 真实接口：Cookie 会话认证）
// ============================================================

// 会话检测: GET /api/session（公开接口，未登录返回 200 且不含 account 字段）
export async function fetchSession(): Promise<SessionResponse | null> {
  try {
    const { data } = await api.get<StorydenSession>(`/api/session`);
    if (!data?.account) return null;
    // 真实 API 返回字段：account.name / account.handle / account.bio（HTML）/
    // account.joined，对应本站 user 的 name / avatar / bio
    return { user: userFromAccount(data.account) };
  } catch {
    return null;
  }
}

// 退出登录: POST /api/auth/logout（服务端使会话失效，withCredentials 自动携带 storyden-session）
export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

// 登录: POST /api/auth/password/signin
// StoryDen 认证模式为 handle（handle + password）；浏览器输入的邮箱/昵称作为 identifier 提交，
// 密码作为 token 提交。成功由后端 Set-Cookie 下发 storyden-session，前端不保存 token。
export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<{ id: string }>('/api/auth/password/signin', {
    identifier: input.email,
    token: input.password,
  });
  return { token: data.id, user: { name: input.email, avatar: '' } };
}

// 注册: POST /api/auth/password/signup（handle + password，可选 ?invitation_id= 邀请码）
// 注册成功即建立会话（后端 Set-Cookie），由 AuthForm 调用 refresh() 刷新认证状态
export async function register(input: RegisterInput): Promise<{ success: boolean }> {
  await api.post<{ id: string }>('/api/auth/password/signup', {
    identifier: input.name,
    token: input.password,
  }, {
    // Storyden 规格：invitation_id 是 query 参数（管理员开启邀请制时校验，未开启时传了也会被忽略）
    params: input.invitationId ? { invitation_id: input.invitationId } : {},
  });
  return { success: true };
}

// ============================================================
//  帖子（StoryDen 真实资源名：thread）
// ============================================================

// 帖子列表: GET /api/threads（支持 ?q= 搜索 / ?author= 作者 / ?tags= 标签筛选）
export async function fetchPosts(): Promise<PostListItem[]> {
  const { data } = await api.get<{ threads: StorydenThread[] }>('/api/threads');
  return (data.threads ?? []).map(threadToPostListItem);
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

// ============ 收藏夹管理（StoryDen Collection 资源） ============

export interface CollectionItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  item_count: number;
  created_at: string;
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

// ============ 通知（StoryDen Notification 资源） ============

export interface NotificationItem {
  id: string;
  event: string;
  status: 'unread' | 'read';
  created_at: string;
  source_handle?: string;
  source_name?: string;
  item_kind?: string;
  item_id?: string;
  item_slug?: string;
  item_title?: string;
}

// 通知列表: GET /api/notifications（未读优先）
// 基于Storyden官方规格 DatagraphItem 判别器：kind 为 post / thread / reply / node / profile
export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<{ notifications: StorydenNotification[] }>('/api/notifications');
  return (data.notifications ?? []).map((n) => {
    const kind = n.item?.kind ?? '';
    const item = n.item?.ref as
      | StorydenThread
      | StorydenNode
      | StorydenReply
      | StorydenProfile
      | undefined;
    // 回复类通知（thread_reply / reply_to_reply）的 ref 是 Reply 而非 Thread：
    // Reply 自身 id 是评论 id，root_id 才是所属帖子的 id、root_slug 是帖子 slug，
    // 直接拿 reply 的 id 跳 /post/{id} 会 404。凡带 root_id 的 ref 统一按回复处理
    //（提及等事件 ref 为 post 时也可能是 Reply）。
    const reply = item && 'root_id' in item ? (item as StorydenReply) : undefined;
    // 关注类通知（follow）的 ref 是 ProfileReference，handle 即成员标识
    const profile = kind === 'profile' ? (item as StorydenProfile | undefined) : undefined;
    return {
      id: n.id,
      event: n.event,
      status: n.status === 'read' ? 'read' : 'unread',
      created_at: n.created_at,
      source_handle: n.source?.handle,
      source_name: n.source?.name,
      item_kind: kind,
      item_id: reply?.root_id ?? profile?.handle ?? item?.id,
      item_slug: (item as StorydenNode)?.slug ?? reply?.root_slug ?? (item as StorydenThread)?.slug,
      item_title: (item as StorydenThread)?.title ?? (item as StorydenNode)?.name ?? '',
    };
  });
}

// 标记通知已读: PATCH /api/notifications/{id}
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}`, { status: 'read' });
}

// ============================================================
//  知识库（StoryDen 真实资源名：node）
// ============================================================

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

// ============================================================
//  链接（StoryDen 真实资源名：link）
// ============================================================

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
    description: '提交后由服务端自动抓取网页标题与描述（OG 信息）。',
    image: '',
    domain,
    author: { name: '我', avatar: '' },
    created_at: '',
    tags: [],
    like_count: 0,
    is_liked: false,
  };
}

// ============================================================
//  标签（StoryDen 真实资源名：tag）
// ============================================================

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

// ============================================================
//  成员（StoryDen 真实资源名：profile）
// ============================================================
// 注意：GET /api/profiles 需要登录（StoryDen 全局安全要求），未登录访问返回 403。
// 本站成员页对访客开放，因此在页面内对 403 做内联提示（skipGlobalHandling 跳过全局弹窗）。

// 成员列表（分页）：GET /api/profiles?page=&page_size=
// StoryDen 不支持按昵称搜索，搜索在客户端完成（与 mock 阶段行为一致）
export async function fetchMembers(
  params: { page?: number; pageSize?: number; search?: string } = {}
): Promise<MembersResponse> {
  const { page = 1, pageSize = 20 } = params;
  const { data } = await api.get<{ profiles: StorydenProfile[]; results?: number }>('/api/profiles', {
    params: { page, page_size: pageSize },
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  const profiles = data.profiles ?? [];
  // 客户端搜索（真实 API 无 search 参数）
  const keyword = (params.search ?? '').trim().toLowerCase();
  const filtered = keyword ? profiles.filter((p) => (p.name ?? '').toLowerCase().includes(keyword)) : profiles;
  return {
    members: filtered.map(profileToMember),
    total: data.results ?? profiles.length,
    page,
    pageSize,
  };
}

// 成员详情: GET /api/profiles/{handle}（公开只读，需登录）
export async function fetchMember(handle: string): Promise<Member> {
  const { data } = await api.get<StorydenProfile>(`/api/profiles/${encodeURIComponent(handle)}`, {
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  return profileToMember(data);
}

// 关注 / 取关: PUT / DELETE /api/profiles/{handle}/followers
export async function toggleFollow(handle: string, following: boolean): Promise<void> {
  if (following) {
    await api.put(`/api/profiles/${encodeURIComponent(handle)}/followers`);
  } else {
    await api.delete(`/api/profiles/${encodeURIComponent(handle)}/followers`);
  }
}

// 粉丝 / 关注列表: GET /api/profiles/{handle}/followers|following
export async function fetchFollowList(
  handle: string,
  type: 'followers' | 'following'
): Promise<Member[]> {
  const { data } = await api.get<{ [key: string]: StorydenProfile[] }>(
    `/api/profiles/${encodeURIComponent(handle)}/${type}`,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
  return (data[type] ?? []).map(profileToMember);
}

// ============================================================
//  角色 / 账号管理（Storyden 管理员接口）
// ============================================================
// Storyden v1.26 的权限模型：
// - 账号有 admin（布尔）与 roles（角色列表）两个维度，二者独立存储
//   （本站数据库实测：accounts.admin 为布尔列，account_roles 为关联表）
// - 内置角色可改名（本站：admin→Manager、member→Reseachers、guest→Readers），
//   角色 id 不变，权限在角色内配置
// - 管理员操作接口（admin 专属，服务端校验）：
//   PUT/DELETE /api/accounts/{handle}/roles/{role_id} 分配/移除角色
//   POST/DELETE /api/admin/bans/{handle}              封禁/解封
//   PATCH /api/accounts/{account_id}                  改 admin / verified_status
// 注：真实权限校验在服务端，前端界面只是操作入口，无权调用会收到 403。

// Storyden 内置角色 id（源码固定常量，不可更改）：
// member 角色（m0）注入到每个账号、guest（g0）与 admin（a00）按需注入；
// 内置角色通过 GET /api/roles 的返回本身不含 default 标志，需按 id 识别
const DEFAULT_ROLE_IDS = new Set([
  '0000000000000000000g', // guest
  '000000000000000000m0', // member
  '00000000000000000a00', // admin
]);

// 角色（GET /api/roles 返回）
export interface RoleInfo {
  id: string;
  name: string;
  colour: string;
  permissions: string[];
  // 是否含 ADMINISTRATOR 权限（「设为管理员」的判断依据）
  is_administrator: boolean;
  // 是否内置角色（Storyden 注入/受保护，member 角色的分配移除会被后端静默过滤）
  is_default: boolean;
}

// 账号上的角色引用（GET /api/admin/accounts 的 Account.roles）
// default: Storyden 会把内置默认角色（member/admin/guest）注入到每个账号的角色列表里，
// 其中 member 角色（本站为「Readers」）是所有账号的隐含基线角色，后端过滤其分配/移除操作；
// admin 角色在账号 admin=true 时注入。default=true 的角色不应提供移除入口。
export interface AdminRoleRef {
  id: string;
  name: string;
  colour: string;
  default?: boolean;
}

// 账号管理视图（GET /api/admin/accounts / 封禁接口返回的 Account）
export interface AdminAccountView {
  id: string;
  handle: string;
  name: string;
  joined?: string;
  suspended?: string; // 封禁时间；有值表示已封禁
  verified_status: string; // none | verified_email | manual
  admin: boolean;
  roles: AdminRoleRef[];
}

// Account → 管理视图（真实 API 字段：admin / roles / suspended / verified_status）
function accountToAdminView(a: StorydenAdminAccount): AdminAccountView {
  return {
    id: a.id ?? '',
    handle: a.handle ?? '',
    name: a.name || a.handle || '未知用户',
    joined: a.joined ?? a.createdAt,
    suspended: a.suspended,
    verified_status: a.verified_status ?? 'none',
    admin: a.admin ?? false,
    roles: (a.roles ?? []).map((r) => ({
      id: r.id ?? '',
      name: r.name ?? '未知角色',
      colour: r.colour ?? '',
      default: r.default ?? false,
    })),
  };
}

// 角色列表: GET /api/roles（公开，无需登录）
export async function fetchRoles(): Promise<RoleInfo[]> {
  const { data } = await api.get<{ roles: StorydenRole[] }>('/api/roles');
  return (data.roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    colour: r.colour ?? '',
    permissions: r.permissions ?? [],
    is_administrator: (r.permissions ?? []).includes('ADMINISTRATOR'),
    is_default: DEFAULT_ROLE_IDS.has(r.id),
  }));
}

// 账号管理列表: GET /api/admin/accounts?q=&page=&page_size=（仅管理员）
// 与成员列表（/api/profiles）不同，这里返回完整 Account（含 roles / admin / suspended）
export async function fetchAdminAccounts(
  params: { q?: string; page?: number; pageSize?: number } = {}
): Promise<{ accounts: AdminAccountView[]; total: number; page: number; totalPages: number }> {
  const { page = 1, pageSize = 20 } = params;
  const { data } = await api.get<{
    accounts: StorydenAdminAccount[];
    results?: number;
    current_page?: number;
    total_pages?: number;
  }>('/api/admin/accounts', {
    params: { q: params.q || undefined, page, page_size: pageSize },
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  return {
    accounts: (data.accounts ?? []).map(accountToAdminView),
    total: data.results ?? (data.accounts ?? []).length,
    page: data.current_page ?? page,
    totalPages: data.total_pages ?? 1,
  };
}

// 全量账号管理视图（循环分页拉完所有页；仅管理员可调用，403 由调用方处理）
// 用途：成员列表页管理员视角的封禁状态过滤（公开列表接口不带 suspended，只能走这里）
export async function fetchAllAdminAccounts(): Promise<AdminAccountView[]> {
  const all: AdminAccountView[] = [];
  let page = 1;
  for (;;) {
    const res = await fetchAdminAccounts({ page, pageSize: 500 });
    all.push(...res.accounts);
    if (page >= res.totalPages || res.accounts.length === 0) break;
    page += 1;
  }
  return all;
}

// 分配角色: PUT /api/accounts/{handle}/roles/{role_id}（仅管理员）
export async function assignRole(handle: string, roleId: string): Promise<void> {
  await api.put(
    `/api/accounts/${encodeURIComponent(handle)}/roles/${encodeURIComponent(roleId)}`,
    undefined,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}

// 移除角色: DELETE /api/accounts/{handle}/roles/{role_id}（仅管理员）
export async function removeRole(handle: string, roleId: string): Promise<void> {
  await api.delete(
    `/api/accounts/${encodeURIComponent(handle)}/roles/${encodeURIComponent(roleId)}`,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}

// 封禁账号: POST /api/admin/bans/{handle}（仅管理员）
export async function banAccount(handle: string): Promise<void> {
  await api.post(
    `/api/admin/bans/${encodeURIComponent(handle)}`,
    undefined,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}

// 解封账号: DELETE /api/admin/bans/{handle}（仅管理员）
export async function unbanAccount(handle: string): Promise<void> {
  await api.delete(
    `/api/admin/bans/${encodeURIComponent(handle)}`,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}

// 修改账号管理字段: PATCH /api/accounts/{account_id}（仅管理员）
// flags.admin → 管理员标记（布尔列）；flags.verified_status → none | verified_email | manual
export async function updateAccountFlags(
  accountId: string,
  flags: { admin?: boolean; verified_status?: string }
): Promise<void> {
  await api.patch(
    `/api/accounts/${encodeURIComponent(accountId)}`,
    flags,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
}

// ============================================================
//  个人中心（组合多个真实接口）
// ============================================================

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
  for (const c of myCollections) {
    const mark = c.slug || c.id;
    const { data } = await api.get<{ items: StorydenCollectionItem[] }>(`/api/collections/${mark}`);
    for (const item of data.items ?? []) {
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
  const session = await fetchSession();
  return session?.user?.avatar ?? '';
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

// ============================================================
//  StoryDen 真实响应结构（局部定义，仅标注用到的字段）
// ============================================================

interface StorydenAccount {
  handle?: string;
  name?: string;
  bio?: string | null;
  joined?: string;
  id?: string;
  // 基于Storyden官方规格: 管理员标记（布尔，Account.admin），用于前端角色权限判断
  admin?: boolean;
}

interface StorydenTag {
  name: string;
  colour?: string;
  item_count?: number;
}

interface StorydenReply {
  id: string;
  author?: StorydenAccount;
  body?: string;
  createdAt: string;
  reply_to?: string;
  // 基于Storyden官方规格 ReplyProps: 所属帖子的 id / slug（通知跳转用）
  root_id?: string;
  root_slug?: string;
}

interface StorydenThread {
  id: string;
  title: string;
  slug?: string;
  body?: string;
  description?: string;
  author?: StorydenAccount;
  createdAt: string;
  updatedAt?: string;
  pinned?: number;
  tags?: Array<string | { name?: string }>;
  likes?: { liked?: boolean; likes?: number };
  collections?: { has_collected?: boolean; in_collections?: number };
  reply_status?: { replied?: number; replies?: number };
  replies?: { replies?: StorydenReply[] };
  visibility?: string;
  category?: { id: string; name: string; slug: string };
}

interface StorydenCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  colour?: string;
  postCount?: number;
}

interface StorydenNode {
  id: string;
  slug: string;
  name: string;
  content?: string;
  description?: string;
  owner?: StorydenAccount;
  createdAt: string;
  updatedAt?: string;
  parent?: { slug?: string; id?: string; name?: string };
  children?: StorydenNode[];
  tags?: Array<string | { name?: string }>;
  visibility?: string;
}

interface StorydenLink {
  id?: string;
  slug: string;
  url: string;
  title?: string;
  description?: string;
  domain?: string;
  primary_image?: { path?: string };
  favicon_image?: { path?: string };
}

interface StorydenProfile {
  id: string;
  handle?: string;
  name?: string;
  bio?: string;
  joined?: string;
  createdAt?: string;
  followers?: number;
  following?: number;
  interests?: Array<string | { name?: string }>;
  links?: { text?: string; url: string }[];
  // 封禁时间（soft delete 的 deleted_at；仅详情接口返回，列表接口不带）
  deletedAt?: string;
}

// 角色（GET /api/roles 返回；permissions 为权限码列表，ADMINISTRATOR 即管理员权限）
interface StorydenRole {
  id: string;
  name: string;
  colour?: string;
  permissions?: string[];
}

// 管理视图下的完整 Account（GET /api/admin/accounts / 封禁接口返回）
// 比 PublicProfile 多出 admin / roles / suspended / verified_status
interface StorydenAdminAccount {
  id?: string;
  handle?: string;
  name?: string;
  joined?: string;
  createdAt?: string;
  admin?: boolean;
  suspended?: string;
  verified_status?: string;
  // default=true：Storyden 注入的隐含角色（member 每个账号都有 / admin 在 admin=true 时注入）
  roles?: Array<{ id?: string; name?: string; colour?: string; default?: boolean }>;
}

interface StorydenSession {
  account?: StorydenAccount;
  info?: { authentication_mode?: string };
}

interface StorydenCollection {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  item_count?: number;
  createdAt?: string;
  owner?: StorydenAccount;
}

interface StorydenNotification {
  id: string;
  event: string;
  status: string;
  created_at: string;
  source?: StorydenAccount;
  item?: { kind?: string; ref?: StorydenThread | StorydenNode | StorydenLink };
}

interface StorydenCollectionItem {
  item?: { kind: 'post' | 'node' | 'link'; ref?: StorydenThread | StorydenNode | StorydenLink };
}

interface StorydenTagItem {
  kind: 'thread' | 'node' | 'link';
  ref?: StorydenThread | StorydenNode | StorydenLink;
}

interface CommentItem {
  id: string;
  author: string;
  content: string;
  created_at: string;
  replies: CommentItem[];
}
