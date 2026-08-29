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
import {
  api,
  type ApiRequestConfig,
  type StorydenAdminAccount,
  type StorydenRole,
} from './shared';
import { tr } from '@/lib/i18n';

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
    name: a.name || a.handle || tr('未知用户'),
    joined: a.joined ?? a.createdAt,
    suspended: a.suspended,
    verified_status: a.verified_status ?? 'none',
    admin: a.admin ?? false,
    roles: (a.roles ?? []).map((r) => ({
      id: r.id ?? '',
      name: r.name ?? tr('未知角色'),
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
