// ============================================================
//  API 共享层：axios 实例 / 错误类型 / 拦截器 / 字段适配转换器
//  由 lib/api/ 下各域模块（auth/posts/collections/...）共用
// ============================================================
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { htmlToMarkdown, htmlToPlainText } from '@/lib/markdown';
import type { LibraryNode, LinkItem, Member, PostDetail, PostListItem, User } from '@/types';

// ============ 环境适配（生产环境兼容） ============
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
export interface ApiRequestConfig extends InternalAxiosRequestConfig {
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
export function tagNames(tags: Array<string | { name?: string }> | undefined | null): string[] {
  return (tags ?? []).map((t) => (typeof t === 'string' ? t : t?.name ?? '')).filter(Boolean);
}

// Account（会话/作者）→ 前端 User
// 真实 API 返回字段为 handle / name / bio（HTML）/ joined / admin，
// 对应本站的 name / avatar / bio / joined_at / role
export function userFromAccount(acc: StorydenAccount | undefined): User {
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
export function threadToPostListItem(t: StorydenThread): PostListItem {
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
export function threadToPostDetail(t: StorydenThread): PostDetail {
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
export function nodeToLibraryNode(n: StorydenNode): LibraryNode {
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
export function linkToLinkItem(l: StorydenLink): LinkItem {
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
export function profileToMember(p: StorydenProfile): Member {
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
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ============================================================
//  StoryDen 真实响应结构（局部定义，仅标注用到的字段）
// ============================================================

export interface StorydenAccount {
  handle?: string;
  name?: string;
  bio?: string | null;
  joined?: string;
  id?: string;
  // 基于Storyden官方规格: 管理员标记（布尔，Account.admin），用于前端角色权限判断
  admin?: boolean;
}

export interface StorydenTag {
  name: string;
  colour?: string;
  item_count?: number;
}

export interface StorydenReply {
  id: string;
  author?: StorydenAccount;
  body?: string;
  createdAt: string;
  reply_to?: string;
  // 基于Storyden官方规格 ReplyProps: 所属帖子的 id / slug（通知跳转用）
  root_id?: string;
  root_slug?: string;
}

export interface StorydenThread {
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

export interface StorydenCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  colour?: string;
  postCount?: number;
}

export interface StorydenNode {
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

export interface StorydenLink {
  id?: string;
  slug: string;
  url: string;
  title?: string;
  description?: string;
  domain?: string;
  primary_image?: { path?: string };
  favicon_image?: { path?: string };
}

export interface StorydenProfile {
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
export interface StorydenRole {
  id: string;
  name: string;
  colour?: string;
  permissions?: string[];
}

// 管理视图下的完整 Account（GET /api/admin/accounts / 封禁接口返回）
// 比 PublicProfile 多出 admin / roles / suspended / verified_status
export interface StorydenAdminAccount {
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

export interface StorydenSession {
  account?: StorydenAccount;
  info?: { authentication_mode?: string };
}

export interface StorydenCollection {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  item_count?: number;
  createdAt?: string;
  owner?: StorydenAccount;
}

export interface StorydenNotification {
  id: string;
  event: string;
  status: string;
  created_at: string;
  source?: StorydenAccount;
  item?: { kind?: string; ref?: StorydenThread | StorydenNode | StorydenLink };
}

export interface StorydenCollectionItem {
  item?: { kind: 'post' | 'node' | 'link'; ref?: StorydenThread | StorydenNode | StorydenLink };
}

export interface StorydenTagItem {
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
