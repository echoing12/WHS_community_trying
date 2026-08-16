'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, Heart, Search, UserX } from 'lucide-react';
import useSWR from 'swr';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { banAccount, fetchAllAdminAccounts, fetchMembers } from '@/lib/api';
import { scheduleKick } from '@/lib/kicks';
import { formatDate } from '@/lib/utils';
import type { Member } from '@/types';

// 每页成员数
const PAGE_SIZE = 20;

export default function MembersPage() {
  const { isAuthenticated, user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // 管理员视角：被封禁（已踢出）的成员 handle 集合 —— 用于过滤显示
  // 公开列表接口（GET /api/profiles）不过滤被封禁账号也不带状态，
  // 只有管理员接口（GET /api/admin/accounts）返回 suspended，因此过滤仅管理员可见
  const [bannedHandles, setBannedHandles] = useState<Set<string>>(new Set());
  // 正在执行踢出操作的 handle（防止重复点击）
  const [kicking, setKicking] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // 搜索条件变化时回到第一页（React 18 自动批处理，只触发一次请求）
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // 成员列表：SWR 缓存（key 含分页与搜索条件，翻页/搜索自动重新验证）
  const { data, error, isLoading, mutate } = useSWR(
    ['members', page, search],
    // 真实 API：GET /api/profiles?page=&page_size=（StoryDen 成员即 profile，需登录）
    () => fetchMembers({ page, pageSize: PAGE_SIZE, search }),
    { keepPreviousData: true }
  );
  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const loading = isLoading && members.length === 0;

  // 管理员额外加载全量账号封禁状态（仅管理员可访问该接口；失败时静默，
  // 不影响成员列表展示，只是本页不再做已踢出过滤）
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchAllAdminAccounts()
      .then((accounts) => {
        if (cancelled) return;
        setBannedHandles(new Set(accounts.filter((a) => a.suspended).map((a) => a.handle)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // 管理员视角：过滤掉已踢出的成员（“不显示该成员的信息”）
  const visibleMembers = isAdmin ? members.filter((m) => !bannedHandles.has(m.id)) : members;

  // 踢出成员 = 封禁（Storyden soft delete）+ 本地记录 24 小时后自动解封
  const kickMember = async (member: Member) => {
    if (kicking) return;
    const confirmed = window.confirm(
      `确定将「${member.name}」移出社区吗？\n` +
        `TA 在 24 小时内无法登录社区，到期自动解封恢复。\n` +
        `TA 发布的帖子与评论保留。可在管理后台 /admin/members 手动提前解封。`
    );
    if (!confirmed) return;
    setKicking(member.id);
    try {
      // 封禁（服务端校验管理员权限，无权调用会 403）
      await banAccount(member.id);
      // 本地记录到期时间，供自动解封调度（见 lib/kicks.ts）
      scheduleKick(member.id, member.name);
      // 立即从本页列表中移除（管理员视角；visibleMembers 按 bannedHandles 过滤）
      setBannedHandles((prev) => new Set(prev).add(member.id));
      void mutate(); // 同步 SWR 缓存（下次翻页/返回时不再显示该成员）
    } catch (err) {
      window.alert(err instanceof Error && err.message ? err.message : '操作失败，请重试');
    } finally {
      setKicking(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 管理员视角的总数显示（减去已踢出的成员）
  const shownTotal = isAdmin ? Math.max(0, total - bannedHandles.size) : total;

  return (
    <div className="space-y-6">
      {/* 页头：标题 + 搜索框 */}
      <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">👥 成员列表</h1>
          <p className="mt-2 text-ink/70">认识社区里的每一位伙伴，点击成员可以查看 TA 的主页。</p>
        </div>
        {/* 搜索框：按昵称搜索（客户端过滤，真实 API 无 search 参数） */}
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="按昵称搜索成员…"
            className="pl-11"
          />
        </div>
      </section>

      {/* 管理员提示：已移出的成员（本页已隐藏，可在管理后台恢复） */}
      {isAdmin && bannedHandles.size > 0 && (
        <div className="hand-card flex flex-wrap items-center justify-center gap-2 p-4 text-center text-sm lg:justify-between lg:text-left">
          <span className="font-bold text-ink/70">
            {bannedHandles.size} 名成员已被移出社区（24 小时临时封禁，到期自动恢复）
          </span>
          <Link href="/admin/members" className="inline-block">
            <Button size="sm">去管理后台解封</Button>
          </Link>
        </div>
      )}

      {/* 成员列表 */}
      {loading && members.length === 0 ? (
        <p className="py-16 text-center text-ink/50">加载中…</p>
      ) : error && members.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">查看成员列表需要登录，请先登录后重试</p>
          <Link href="/auth/login" className="mt-4 inline-block">
            <Button>去登录</Button>
          </Link>
        </div>
      ) : visibleMembers.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">没有找到匹配的成员</p>
          <p className="mt-2 text-sm text-ink/60">换个昵称关键词试试吧</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                canKick={isAdmin && !!user?.handle && member.id !== user.handle}
                kicking={kicking === member.id}
                onKick={kickMember}
              />
            ))}
          </div>

          {/* 分页（每页 20 个） */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-ink/30 bg-surface/60 px-4 py-3">
            <span className="text-sm text-ink/60">共 {shownTotal} 位成员</span>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <span className="px-1 text-sm font-bold text-ink/70">
                {page} / {totalPages}
              </span>
              <Button
                variant="default"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        成员信息仅供社区内部交流使用，请勿在站外传播；本社区仅供 WHS 患者交流，不构成医疗建议
      </p>
    </div>
  );
}

// 成员卡片：头像 + 昵称 + 注册时间 + 粉丝数，点击进入成员主页；
// 管理员（非本人）额外显示「踢出」按钮（移出社区 24 小时，到期自动解封）
function MemberCard({
  member,
  canKick,
  kicking,
  onKick,
}: {
  member: Member;
  canKick: boolean;
  kicking: boolean;
  onKick: (member: Member) => void;
}) {
  return (
    <article className="hand-card flex items-center gap-4 p-4">
      <Link
        href={`/members/${member.id}`}
        className="group flex min-w-0 flex-1 items-center gap-4"
      >
        <Avatar name={member.name} src={member.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="hand-title truncate text-lg text-ink group-hover:underline">
            {member.name}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink/60">
            <Calendar className="h-3.5 w-3.5" />
            注册于 {member.joined_at ? formatDate(member.joined_at) : '—'}
          </p>
          <p className="mt-0.5 text-xs font-bold text-ink/40">
            <Heart className="mr-0.5 inline h-3 w-3" />
            {member.followers ?? 0} 粉丝
          </p>
        </div>
      </Link>

      {/* 管理员踢出按钮（按钮不能嵌在 Link 内，故与链接并排） */}
      {canKick && (
        <div className="flex shrink-0 items-center border-l-2 border-dashed border-ink/20 pl-3">
          <Button
            size="sm"
            disabled={kicking}
            onClick={() => onKick(member)}
            title="移出社区 24 小时（封禁），到期自动解封"
          >
            <UserX className="h-3.5 w-3.5" />
            {kicking ? '踢出中…' : '踢出'}
          </Button>
        </div>
      )}
    </article>
  );
}
