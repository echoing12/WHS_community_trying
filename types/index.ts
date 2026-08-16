// ============ 通用类型定义 ============
// 数据结构对应 StoryDen 真实 API（v1.26）：
// 字段名以本站页面使用的为准，与后端字段的映射统一在 lib/api.ts 中完成
//（如 thread.createdAt → created_at、node.name → title、link.slug → id 等）。

export interface User {
  name: string;
  avatar: string; // 头像 URL；空字符串时显示姓名首字占位头像
  bio?: string;
  handle?: string; // 真实 API 字段 account.handle（判断「是否我自己的内容」用）
  // 基于Storyden官方规格: 角色由会话接口（GET /api/session）的 account.admin（布尔）映射而来，
  // 管理员可管理任意内容（编辑 / 删除他人帖子与知识库页面）
  role?: 'admin' | 'member';
}

// 帖子列表项（GET /api/threads 返回）
export interface PostListItem {
  id: string;
  title: string;
  author: User;
  created_at: string; // ISO 8601（真实 API 字段 createdAt）
  reply_count: number; // 真实 API 字段 reply_status.replies
  tags: string[];
  like_count: number; // 真实 API 字段 likes.likes
  is_liked?: boolean; // 真实 API 字段 likes.liked
  is_collected?: boolean; // 真实 API 字段 collections.has_collected
  is_pinned?: boolean; // 真实 API 字段 pinned > 0
  category?: { id: string; name: string; slug: string } | null; // 真实 API 字段 category
}

// 评论（支持嵌套回复，replies 递归；真实 API 用 reply_to 指向父评论 id）
export interface Comment {
  id: string;
  author: string; // 评论者昵称（真实 API 字段 author.name）
  content: string; // 纯文本（真实 API 字段 body，HTML，展示前已转换）
  created_at: string;
  replies?: Comment[];
}

// 帖子详情（GET /api/threads/{id} 返回）
export interface PostDetail {
  id: string;
  title: string;
  content: string; // Markdown（真实 API 字段 body，HTML → Markdown 转换后）
  author: User;
  created_at: string;
  reply_count?: number;
  replies: Comment[];
  tags?: string[];
  like_count: number;
  is_liked?: boolean;
  is_collected?: boolean;
  is_pinned?: boolean;
  category?: { id: string; name: string; slug: string } | null; // 真实 API 字段 category
}

// 创建帖子（POST /api/threads 请求体；body 由 api.ts 内部转成 HTML）
export interface CreatePostInput {
  title: string;
  content: string;
  tags: string[];
  category_id?: string; // 分类（StoryDen category 资源，值为 id）
}

// 分类（GET /api/categories 返回；StoryDen 帖子按分类组织）
export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  colour?: string;
  postCount?: number;
}

// 登录（POST /api/auth/password/signin：identifier = 邮箱/昵称，token = 密码）
export interface LoginInput {
  email: string;
  password: string;
}

// 注册（POST /api/auth/password/signup：identifier = 昵称，token = 密码）
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  // 可选邀请码（对应 Storyden 的 ?invitation_id= query 参数；
  // 管理员开启邀请制后注册必须填写，未开启时忽略）
  invitationId?: string;
}

// 登录成功返回（真实 API 只返回会话 id，token 字段为兼容占位）
export interface AuthResponse {
  token: string;
  user: User;
}

// 会话检测（GET /api/session 返回 account；未登录时无 account）
export interface SessionResponse {
  user: User;
}

// 个人资料（组合 GET /api/session + ?author= 过滤 + Collections 收藏夹）
export interface Profile {
  user: {
    id?: string; // 真实 API 字段 account.id（更新简介 PATCH /api/accounts/{id} 用）
    name: string;
    avatar: string;
    joined_at: string; // 真实 API 字段 account.joined
    bio: string; // 真实 API 字段 account.bio（HTML → 纯文本）
    posts: PostListItem[]; // GET /api/threads?author={handle}
    library_pages: LibraryNode[]; // GET /api/nodes?author={handle}
    drafts?: LibraryNode[]; // 我的草稿（GET /api/nodes/drafts）
    collections: {
      posts: PostListItem[]; // 我收藏的帖子（Collections 中 kind=post）
      library_pages: LibraryNode[]; // 我收藏的知识库页面（Collections 中 kind=node）
    };
  };
}

// 知识库页面节点（GET /api/nodes 返回的 Node 树）
export interface LibraryNode {
  id: string;
  slug: string; // URL 友好标识（真实 API 字段 slug，如 "handbook"）
  title: string; // 真实 API 字段 name
  content?: string; // Markdown（真实 API 字段 content，HTML → Markdown 转换后）
  summary?: string; // 简介（真实 API 字段 description）
  author: User; // 真实 API 字段 owner
  created_at: string; // 真实 API 字段 createdAt
  updated_at?: string;
  tags: string[];
  parent_id: string | null; // 父级 slug（真实 API 字段 parent.slug）；null 表示根节点
  children: LibraryNode[];
  like_count: number; // 真实 API 无节点点赞，恒为 0
  is_liked?: boolean;
  is_collected?: boolean;
}

// 创建知识库页面（POST /api/nodes 请求体）
export interface CreateLibraryPageInput {
  title: string;
  content: string;
  tags: string[];
  parent_slug: string | null; // 父级目录 slug（真实 API 字段 parent）
  summary?: string; // 简介（真实 API 字段 description，可选）
}

// 链接分享项（GET /api/links 返回）
// 真实 API 的 Link 无 author / created_at / tags / like_count，页面按可选字段适配
export interface LinkItem {
  id: string; // 真实 API 字段 slug
  slug?: string;
  url: string;
  title: string;
  description: string;
  image: string; // OG 图片 URL（真实 API 字段 primary_image.path）；空字符串时显示占位块
  domain: string; // 真实 API 字段 domain
  author: User; // 真实 API 无作者字段，固定为「社区成员」
  created_at: string; // 真实 API 无该字段，页面不展示
  tags: string[];
  like_count: number; // 真实 API 无链接点赞，恒为 0
  is_liked?: boolean;
}

// 提交链接（POST /api/links 请求体；真实 API 仅支持 url / title / description）
export interface SubmitLinkInput {
  url: string;
  title: string;
  description: string;
  tags: string[];
}

// 标签（GET /api/tags 返回；真实 API 只有 name / item_count，
// posts_count 等分类计数不存在，统一为 0，页面按需隐藏）
export interface TagItem {
  name: string;
  count: number; // 真实 API 字段 item_count
  posts_count: number;
  library_count: number;
  links_count: number;
}

// 标签详情（GET /api/tags/{name} 返回）：聚合三种内容
export interface TagDetail {
  tag: TagItem;
  posts: PostListItem[]; // items 中 kind=thread
  library_pages: LibraryNode[]; // items 中 kind=node
  links: LinkItem[]; // items 中 kind=link
}

// 成员（GET /api/profiles 返回的列表项；需登录）
// 真实 API 的 profile 无头像字段，用姓名首字占位头像
export interface Member {
  id: string; // 真实 API 字段 handle（用于 /members/[id] 详情）
  name: string; // 昵称
  avatar: string; // 头像 URL；空字符串时显示姓名首字占位头像
  joined_at: string; // 注册时间（真实 API 字段 joined）
  bio?: string; // 简介（真实 API 字段 bio，HTML → 纯文本）
  followers?: number; // 粉丝数
  following?: number; // 关注数
  interests?: string[]; // 兴趣标签（真实 API 字段 interests）
  links?: { text: string; url: string }[]; // 主页外部链接
  deleted_at?: string; // 封禁时间（真实 API 字段 deletedAt，soft delete；有值 = 已被移出社区，仅详情接口返回）
}

// 成员列表响应（GET /api/profiles?page=&page_size= 返回）
export interface MembersResponse {
  members: Member[];
  total: number; // 真实 API 字段 results
  page: number;
  pageSize: number;
}
