// ============================================================
//  API 聚合入口（原 lib/api.ts 拆分后的统一出口）
//  页面统一 import { ... } from '@/lib/api'，无需关心各域模块位置
// ============================================================

// 共享层：axios 实例 / 错误类型
export { api } from './shared';
export {
  AuthenticationError,
  PermissionDeniedError,
  BadRequestError,
  RateLimitError,
} from './shared';
export type { ApiRequestConfig } from './shared';

// 认证
export { fetchSession, logout, login, register } from './auth';

// 帖子
export {
  fetchPosts,
  fetchPostDetail,
  createPost,
  updatePost,
  deletePost,
  fetchCategories,
  createReply,
  togglePostLike,
} from './posts';
export type { PostListResult } from './posts';

// 收藏夹
export {
  togglePostBookmark,
  toggleNodeBookmark,
  fetchMyCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  fetchCollectionItems,
} from './collections';
export type { CollectionItem } from './collections';

// 知识库 / 附件
export {
  fetchLibraryTree,
  fetchLibraryPage,
  createLibraryPage,
  updateLibraryPage,
  deleteLibraryPage,
  fetchDrafts,
  uploadAsset,
} from './library';

// 链接
export { fetchLinks, submitLink, fetchLinkMetadata } from './links';

// 标签
export { fetchTags, fetchTagDetail, fetchPostsByTag } from './tags';

// 通知
export { fetchNotifications, markNotificationRead } from './notifications';
export type { NotificationItem } from './notifications';

// 成员
export { fetchMembers, fetchMember, toggleFollow, fetchFollowList } from './members';

// 角色 / 账号管理（管理员）
export {
  fetchRoles,
  fetchAdminAccounts,
  fetchAllAdminAccounts,
  assignRole,
  removeRole,
  banAccount,
  unbanAccount,
  updateAccountFlags,
} from './admin';
export type { RoleInfo, AdminRoleRef, AdminAccountView } from './admin';

// 个人中心
export { fetchProfile, uploadAvatar, updateBio } from './profile';
