'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Ban, CircleCheck, CircleX, Shield, ShieldCheck, UserPlus, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  assignRole,
  banAccount,
  fetchAdminAccounts,
  removeRole,
  unbanAccount,
  updateAccountFlags,
} from '@/lib/api';
import type { AdminAccountView, RoleInfo } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

// ============ 管理员账号操作面板（成员主页卡片 / /admin/members 列表共用） ============
// Storyden v1.26 权限模型：
// - 角色分配/移除: PUT/DELETE /api/accounts/{handle}/roles/{role_id}
// - 管理员标记（admin 布尔列）: PATCH /api/accounts/{account_id} { admin }
//   （账号的 admin 与角色独立存储，设为/取消管理员时两者同步操作，
//     实测账号数据库 accounts.admin 为独立布尔列）
// - 封禁/解封: POST/DELETE /api/admin/bans/{handle}
// - 验证状态: PATCH /api/accounts/{account_id} { verified_status }
// 真实权限校验在服务端，本组件只是操作入口；所有错误内联提示。
// 交互：操作成功后先本地乐观更新（界面即时反馈），再后台重新拉取校正（服务端为准）。

const ROLE_COLOURS: Record<string, string> = {
  red: '#ef4444',
  green: '#10b981',
  gray: '#94a3b8',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
};

const VERIFIED_LABELS: Record<string, string> = {
  none: '未验证',
  verified_email: '已验证邮箱',
  manual: '人工已验证',
};

interface AccountActionsProps {
  account: AdminAccountView;
  roles: RoleInfo[]; // GET /api/roles 的全部角色
  isSelf: boolean; // 是否当前登录用户本人（禁止自降级 / 自封禁）
  onChanged?: (updated: AdminAccountView) => void; // 视图刷新回调（乐观更新 + 后台校正）
}

export default function AccountActions({ account, roles, isSelf, onChanged }: AccountActionsProps) {
  const [busy, setBusy] = useState(false);
  const accountRef = useRef(account);
  accountRef.current = account;

  // 管理员角色（含 ADMINISTRATOR 权限，本站数据库中的 Manager 角色）
  const adminRole = useMemo(() => roles.find((r) => r.is_administrator) ?? null, [roles]);
  const hasRole = (roleId: string) => account.roles.some((r) => r.id === roleId);

  // 操作成功后后台重新拉取管理视图校正（GET /api/admin/accounts?q=handle 定位）
  const refreshAccount = useCallback(async () => {
    try {
      const { accounts: list } = await fetchAdminAccounts({ q: accountRef.current.handle, pageSize: 50 });
      const fresh = list.find((a) => a.handle === accountRef.current.handle);
      if (fresh) onChanged?.(fresh);
    } catch {
      // 校正失败时保留乐观更新结果，不打扰用户
    }
  }, [onChanged]);

  // 统一执行管理操作：防重入 → 调用 → 乐观更新 → 后台校正
  const run = useCallback(
    async (fn: () => Promise<void>, optimistic?: (acc: AdminAccountView) => AdminAccountView) => {
      if (busy) return;
      setBusy(true);
      try {
        await fn();
        if (optimistic && onChanged) onChanged(optimistic(accountRef.current));
      } catch (err) {
        window.alert(err instanceof Error && err.message ? err.message : '操作失败，请重试');
      } finally {
        setBusy(false);
        void refreshAccount();
      }
    },
    [busy, onChanged, refreshAccount]
  );

  // 设为管理员 = 分配管理员角色 + 置 admin 标记（两者独立存储，需同步）
  const grantAdmin = () => {
    if (!adminRole) return;
    void run(
      async () => {
        await assignRole(account.handle, adminRole.id);
        await updateAccountFlags(account.id, { admin: true });
      },
      (acc) => ({
        ...acc,
        admin: true,
        roles: acc.roles.some((r) => r.id === adminRole.id)
          ? acc.roles
          : [...acc.roles, { id: adminRole.id, name: adminRole.name, colour: adminRole.colour }],
      })
    );
  };

  // 取消管理员 = 移除管理员角色 + 清 admin 标记
  const revokeAdmin = () => {
    if (!adminRole) return;
    void run(
      async () => {
        await removeRole(account.handle, adminRole.id);
        await updateAccountFlags(account.id, { admin: false });
      },
      (acc) => ({
        ...acc,
        admin: false,
        roles: acc.roles.filter((r) => r.id !== adminRole.id),
      })
    );
  };

  const assignOtherRole = (role: RoleInfo) => {
    void run(
      () => assignRole(account.handle, role.id),
      (acc) => ({
        ...acc,
        roles: acc.roles.some((r) => r.id === role.id)
          ? acc.roles
          : [...acc.roles, { id: role.id, name: role.name, colour: role.colour }],
      })
    );
  };

  const revokeOtherRole = (roleId: string) => {
    void run(
      () => removeRole(account.handle, roleId),
      (acc) => ({ ...acc, roles: acc.roles.filter((r) => r.id !== roleId) })
    );
  };

  const toggleBan = () => {
    const banned = !!account.suspended;
    const confirmed = window.confirm(
      banned
        ? `确定解封「${account.name}」吗？`
        : `确定封禁「${account.name}」吗？\n被封禁的账号将无法登录，其内容不受影响。`
    );
    if (!confirmed) return;
    void run(
      () => (banned ? unbanAccount(account.handle) : banAccount(account.handle)),
      (acc) => ({ ...acc, suspended: banned ? undefined : new Date().toISOString() })
    );
  };

  const setVerified = (status: string) => {
    if (account.verified_status === status) return;
    void run(
      () => updateAccountFlags(account.id, { verified_status: status }),
      (acc) => ({ ...acc, verified_status: status })
    );
  };

  const otherRoles = roles.filter((r) => !r.is_administrator);

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-ink/40 bg-surface/60 p-4">
      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
        <Shield className="h-4 w-4" />
        权限管理（管理员）
      </p>

      {/* 当前角色（default=true 是 Storyden 注入的隐含角色：
          member 角色每个账号都有、不可移除；admin 角色在 admin=true 时注入） */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink/60">当前角色：</span>
        {account.roles.length === 0 && <span className="text-ink/40">无特殊角色</span>}
        {account.roles.map((r) => (
          <Badge key={r.id} className="gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: ROLE_COLOURS[r.colour] ?? '#94a3b8' }}
            />
            {r.name}
            {r.default && '（默认）'}
            {r.id === adminRole?.id && account.admin && '（管理员）'}
            {r.id === adminRole?.id && !account.admin && '（角色·未置admin）'}
          </Badge>
        ))}
      </div>

      {/* 角色操作（default 角色不可移除：member 是每个账号的隐含基线角色，
          后端会过滤其分配/移除；admin 角色的分配/移除走「设为/取消管理员」按钮） */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-ink/50">角色：</span>
        {adminRole && (
          <>
            {hasRole(adminRole.id) ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || isSelf}
                onClick={revokeAdmin}
                title={isSelf ? '不能取消自己的管理员权限' : '移除管理员角色与标记'}
              >
                <UserX className="h-3.5 w-3.5" />
                取消管理员
              </Button>
            ) : (
              <Button
                size="sm"
                variant="solid"
                disabled={busy}
                onClick={grantAdmin}
                title="分配管理员角色并置 admin 标记"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                设为管理员
              </Button>
            )}
          </>
        )}
        {otherRoles.map((r) => {
          const owned = hasRole(r.id);
          if (r.is_default) {
            // 默认角色（member/guest）由系统注入，无法通过 API 分配/移除
            return (
              <Badge key={r.id} className="gap-1 opacity-60">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: ROLE_COLOURS[r.colour] ?? '#94a3b8' }}
                />
                {owned ? `${r.name}（默认）` : `${r.name}（内置）`}
              </Badge>
            );
          }
          return owned ? (
            <Button key={r.id} size="sm" variant="ghost" disabled={busy} onClick={() => revokeOtherRole(r.id)}>
              <CircleX className="h-3.5 w-3.5" />
              移除「{r.name}」
            </Button>
          ) : (
            <Button key={r.id} size="sm" disabled={busy} onClick={() => assignOtherRole(r)}>
              <UserPlus className="h-3.5 w-3.5" />
              设为「{r.name}」
            </Button>
          );
        })}
        {isSelf && <span className="text-xs text-ink/40">（不能对自己执行降级操作）</span>}
      </div>

      {/* 封禁状态 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold text-ink/50">封禁：</span>
        <span className={cn('font-bold', account.suspended ? 'text-red-600' : 'text-emerald-600')}>
          {account.suspended ? `已封禁（${formatDate(account.suspended)}）` : '正常'}
        </span>
        <Button
          size="sm"
          variant={account.suspended ? 'default' : 'solid'}
          disabled={busy || isSelf}
          onClick={toggleBan}
          title={isSelf ? '不能封禁自己' : undefined}
        >
          <Ban className="h-3.5 w-3.5" />
          {account.suspended ? '解封' : '封禁'}
        </Button>
      </div>

      {/* 验证状态 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold text-ink/50">验证状态：</span>
        {Object.entries(VERIFIED_LABELS).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={account.verified_status === value ? 'solid' : 'ghost'}
            disabled={busy}
            onClick={() => setVerified(value)}
          >
            {account.verified_status === value && <CircleCheck className="h-3.5 w-3.5" />}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
