'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, ShieldAlert } from 'lucide-react';
import AccountActions from '@/components/admin/AccountActions';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { fetchAdminAccounts, fetchRoles } from '@/lib/api';
import type { AdminAccountView, RoleInfo } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ============ 账号管理页（仅管理员；真实权限校验在服务端） ============
// 数据源: GET /api/admin/accounts（管理员专属，返回完整 Account：含角色/封禁/验证状态）
// 操作: 角色分配/移除、封禁/解封、验证状态 —— 由共享组件 AccountActions 提供
const PAGE_SIZE = 20;

export default function AdminMembersPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const t = useT();
  const [accounts, setAccounts] = useState<AdminAccountView[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  // 搜索防抖（q 变化 400ms 后回到第一页并重新加载）
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [roleList, data] = await Promise.all([
        fetchRoles(),
        fetchAdminAccounts({ q, page, pageSize: PAGE_SIZE }),
      ]);
      setRoles(roleList);
      setAccounts(data.accounts);
      setTotal(data.total);
      setTotalPages(Math.max(1, data.totalPages));
    } catch {
      setAccounts([]);
      setTotal(0);
      setError(t('无法加载账号列表，请检查登录状态后重试'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, q, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // 账号列表更新（AccountActions 操作成功后的刷新回调）
  const handleChanged = useCallback((updated: AdminAccountView) => {
    setAccounts((prev) => prev.map((a) => (a.handle === updated.handle ? updated : a)));
  }, []);

  // ---- 访问控制 ----
  if (isLoading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{t('请先登录')}</p>
        <p className="mt-2 text-sm text-ink/60">{t('账号管理需要管理员权限')}</p>
        <Link href="/auth/login" className="mt-4 inline-block">
          <Button>{t('去登录')}</Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="hand-card p-10 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-ink/40" />
        <p className="mt-3 font-medium">{t('无权访问')}</p>
        <p className="mt-2 text-sm text-ink/60">{t('账号管理仅对管理员开放')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页头：标题 + 搜索 */}
      <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">{t('🔧 账号管理')}</h1>
          <p className="mt-2 text-ink/70">
            {t('分配/移除角色、封禁/解封、设置验证状态。权限校验由服务端执行。')}
          </p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('按昵称或账号搜索…')}
            className="pl-11"
          />
        </div>
      </section>

      {/* 账号列表 */}
      {loading && accounts.length === 0 ? (
        <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>
      ) : error ? (
        <div className="hand-card p-10 text-center">
          <p className="font-medium">{error}</p>
          <button onClick={() => load()} className="mt-4 inline-block">
            <Button>{t('重试')}</Button>
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-medium">{t('没有找到匹配的账号')}</p>
          <p className="mt-2 text-sm text-ink/60">{t('换个关键词试试吧')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {accounts.map((account) => (
              <AdminAccountCard
                key={account.id}
                account={account}
                roles={roles}
                isSelf={!!user?.handle && account.handle === user.handle}
                onChanged={handleChanged}
              />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-surface/60 px-4 py-3">
              <span className="text-sm text-ink/60">{t('共 {n} 个账号', { n: total })}</span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('上一页')}
                </Button>
                <span className="px-1 text-sm font-medium text-ink/70">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="default"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('下一页')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 免责声明 */}
      <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
        {t('账号管理操作会影响社区成员的访问权限，请谨慎操作')}
      </p>
    </div>
  );
}

// 单个账号的管理卡片：基本信息 + 角色徽章 + 操作面板（AccountActions）
function AdminAccountCard({
  account,
  roles,
  isSelf,
  onChanged,
}: {
  account: AdminAccountView;
  roles: RoleInfo[];
  isSelf: boolean;
  onChanged: (updated: AdminAccountView) => void;
}) {
  const t = useT();
  return (
    <article className="hand-card space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={account.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="hand-title text-lg text-ink">{account.name}</h3>
            {account.admin && <Badge variant="ink">{t('管理员')}</Badge>}
            {isSelf && <Badge variant="butter">{t('我')}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-ink/60">
            @{account.handle}
            {account.joined ? ` · ${t('注册于 {date}', { date: formatDate(account.joined) })}` : ''}
          </p>
        </div>
      </div>

      <AccountActions account={account} roles={roles} isSelf={isSelf} onChanged={onChanged} />
    </article>
  );
}
