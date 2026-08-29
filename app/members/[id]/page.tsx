'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Heart, LinkIcon, UserPlus, UserMinus } from 'lucide-react';
import AccountActions from '@/components/admin/AccountActions';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import {
  PermissionDeniedError,
  fetchAdminAccounts,
  fetchMember,
  fetchRoles,
  toggleFollow,
} from '@/lib/api';
import type { AdminAccountView, RoleInfo } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type { Member } from '@/types';

// 成员主页（只读；真实 API GET /api/profiles/{handle} 需登录，未登录时内联提示）
export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const t = useT();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  // 我是否已关注 TA
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);
  // 管理员视图：仅管理员加载（角色列表 + 该账号的管理视图，供权限管理卡片使用）
  const [adminView, setAdminView] = useState<AdminAccountView | null>(null);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const loadMember = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setNotFound(false);
    setNeedLogin(false);
    try {
      setMember(await fetchMember(params.id));
    } catch (err) {
      // 真实 API：未登录访问成员详情返回 403（PermissionDeniedError），提示登录
      if (err instanceof PermissionDeniedError) {
        setNeedLogin(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  // 管理员身份：额外加载角色列表与目标账号的管理视图（GET /api/admin/accounts?q=handle）
  // 普通成员不请求（该接口仅管理员可访问），访客/普通成员页面上不显示权限卡片
  const isAdmin = user?.role === 'admin';
  useEffect(() => {
    if (!isAdmin || !params.id) return;
    let cancelled = false;
    setAdminLoading(true);
    (async () => {
      try {
        const [roleList, res] = await Promise.all([
          fetchRoles(),
          fetchAdminAccounts({ q: params.id, pageSize: 50 }),
        ]);
        if (cancelled) return;
        setRoles(roleList);
        setAdminView(res.accounts.find((a) => a.handle === params.id) ?? null);
      } catch {
        // 管理接口异常时不阻塞页面，仅隐藏权限卡片
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, params.id]);

  const handleFollow = async () => {
    if (!member) return;
    const next = !following;
    setFollowing(next);
    setToggling(true);
    try {
      // 真实 API：PUT / DELETE /api/profiles/{handle}/followers
      await toggleFollow(member.id, next);
      setMember((m) =>
        m ? { ...m, followers: (m.followers ?? 0) + (next ? 1 : -1) } : m
      );
    } catch {
      setFollowing(!next); // 失败回滚
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (needLogin) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{t('查看成员主页需要登录')}</p>
        <p className="mt-2 text-sm text-ink/60">{t('登录后即可浏览社区成员信息')}</p>
        <Link href="/auth/login" className="mt-4 inline-block">
          <Button>{t('去登录')}</Button>
        </Link>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{t('成员不存在或已注销')}</p>
        <p className="mt-2 text-sm text-ink/60">{t('TA 可能已经离开了社区')}</p>
        <Link href="/members" className="mt-4 inline-block">
          <Button>{t('返回成员列表')}</Button>
        </Link>
      </div>
    );
  }

  // 自己访问自己的主页 → 跳个人中心
  const isSelf = !!user?.handle && member.id === user.handle;
  const canFollow = isAuthenticated && !isSelf;

  return (
    <div className="space-y-6">
      {/* 返回成员列表 */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('返回成员列表')}
      </Link>

      {/* 成员信息卡片 */}
      <section className="hand-card p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar name={member.name} size="lg" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h1 className="hand-title text-2xl text-ink">{member.name}</h1>
              {/* 已移出社区（管理员封禁，soft delete；详情接口返回 deletedAt，到期自动解封后消失） */}
              {member.deleted_at && <Badge variant="ink">{t('已移出社区（封禁中）')}</Badge>}
              {/* 关注按钮（自己 / 未登录时不显示） */}
              {canFollow && (
                <Button size="sm" onClick={handleFollow} disabled={toggling}>
                  {following ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      {t('取关')}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {t('关注')}
                    </>
                  )}
                </Button>
              )}
              {isSelf && (
                <Link href="/profile">
                  <Button size="sm" variant="solid">
                    {t('编辑我的资料')}
                  </Button>
                </Link>
              )}
            </div>

            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink/60">
              <Calendar className="h-4 w-4" />
              {t('注册于 {date}', { date: member.joined_at ? formatDate(member.joined_at) : '—' })}
            </p>

            {/* 粉丝 / 关注计数 */}
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm font-medium text-ink/70 sm:justify-start">
              <Link href={`/members/${member.id}/followers`} className="transition-colors hover:text-ink">
                <Heart className="mr-1 inline h-4 w-4" />
                {t('{n} 粉丝', { n: member.followers ?? 0 })}
              </Link>
              <Link href={`/members/${member.id}/following`} className="transition-colors hover:text-ink">
                {t('关注 {n}', { n: member.following ?? 0 })}
              </Link>
            </div>

            {/* 简介 */}
            {member.bio && (
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{member.bio}</p>
            )}

            {/* 兴趣标签 */}
            {!!member.interests?.length && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {member.interests.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}

            {/* 主页外部链接 */}
            {!!member.links?.length && (
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 sm:justify-start">
                {member.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 text-sm font-bold underline decoration-butter decoration-2 underline-offset-2 transition-colors hover:text-ink'
                    )}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {l.text || l.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 权限管理卡片（仅管理员可见；角色/封禁/验证状态操作，详见 AccountActions） */}
      {isAdmin && (
        <section className="space-y-4">
          {adminLoading && <p className="text-center text-sm text-ink/50">{t('加载权限信息…')}</p>}
          {!adminLoading && adminView && (
            <AccountActions
              account={adminView}
              roles={roles}
              isSelf={!!user?.handle && member.id === user.handle}
              onChanged={setAdminView}
            />
          )}
          {!adminLoading && !adminView && (
            <p className="rounded-xl border border-ink/10 bg-surface/60 p-4 text-center text-sm text-ink/50">
              {t('未找到该账号的管理信息（账号可能已注销）')}
            </p>
          )}
        </section>
      )}

      {/* 免责声明 */}
      <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
        {t('成员信息仅供社区内部交流使用，请勿在站外传播；本社区仅供 WHS 患者交流，不构成医疗建议')}
      </p>
    </div>
  );
}
