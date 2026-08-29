'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  LinkIcon,
  LogOut,
  Menu,
  PenLine,
  Plus,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import LanguageToggle from '@/components/LanguageToggle';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// ============ 导航项（label 为翻译键） ============
// 用户（成员列表）对所有人可见（含未登录），位于「链接」与「个人中心」之间；
// 注意：Roles（角色）功能暂不实现，不在导航栏显示。
const NAV = [
  { href: '/', label: '首页' },
  { href: '/library', label: '知识库' },
  { href: '/links', label: '链接' },
  { href: '/members', label: '用户' },
  { href: '/tags', label: '标签' },
  { href: '/collections', label: '收藏夹' },
  { href: '/profile', label: '个人中心' },
];

// 「发布」下拉菜单项：发布帖子 / 写知识库页面 / 提交链接
const PUBLISH_ITEMS = [
  { href: '/create', label: '发布帖子', desc: '提问、分享经验', icon: PenLine },
  { href: '/library/create', label: '写知识库页面', desc: '沉淀可长期查阅的知识', icon: BookOpen },
  { href: '/links/submit', label: '提交链接', desc: '分享可靠的外部资料', icon: LinkIcon },
];

// 导航项样式：方框圆角 + 克制 hover / 选中态（浅灰底，不用亮色）
const navItemClass = cn(
  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 lg:px-4',
  'aria-[current=page]:bg-ink/10'
);

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  // 基于Storyden官方规格: 登录状态统一由 useAuth 管理
  // （GET /api/session 检测会话），不再直接读取本地 cookie
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  // ============ 发布下拉菜单状态（点击外部自动收起） ============
  const [publishOpen, setPublishOpen] = useState(false);
  const publishRef = useRef<HTMLDivElement>(null);

  // ============ 移动端抽屉菜单状态 ============
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (publishRef.current && !publishRef.current.contains(e.target as Node)) {
        setPublishOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // 路由变化时自动收起抽屉（点击抽屉内链接跳转后关闭）
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 抽屉打开时锁定 body 滚动（防止背景穿透滚动）+ Esc 关闭
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  // 基于Storyden官方规格: 退出登录 → POST /api/auth/logout（useAuth 内清除本地状态）
  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-mint/90 backdrop-blur">
      {/* max-w-5xl（原 max-w-4xl）: 加入「管理」入口后导航项增多，4xl 宽度会换行错位，
          放宽一行容纳全部导航项（内容区仍为 max-w-4xl，视觉上导航略宽属正常） */}
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 lg:px-8">
        {/* Logo（移动端允许收缩，避免顶栏换行） */}
        <Link href="/" className="hand-title min-w-0 truncate text-lg text-ink sm:text-xl">
          {t('🌿 WHS 互助社区')}
        </Link>

        {/* ============ 桌面端导航（移动端隐藏，抽屉代替） ============ */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={navItemClass}
            >
              {t(item.label)}
            </Link>
          ))}

          {/* 账号管理（仅管理员可见；/api/admin/accounts 等服务端接口也只有管理员可调用） */}
          {!isLoading && isAuthenticated && user?.role === 'admin' && (
            <Link
              href="/admin/members"
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              className={navItemClass}
            >
              {t('管理')}
            </Link>
          )}

          {/* ============ 发布下拉菜单（基于Storyden官方规格权限模型） ============
              发布帖 / 写知识库 / 提交链接均属写操作，Guest（未登录）不可见 */}
          {!isLoading && isAuthenticated && (
            <div ref={publishRef} className="relative ml-1">
              <button
                onClick={() => setPublishOpen((v) => !v)}
                aria-expanded={publishOpen}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 lg:px-4',
                  publishOpen && 'bg-ink/10'
                )}
              >
                <Plus className="h-4 w-4" />
                {t('发布')}
                <ChevronDown
                  className={cn('h-3.5 w-3.5 text-ink/60 transition-transform', publishOpen && 'rotate-180')}
                />
              </button>

              {publishOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-ink/10 bg-surface p-1.5 shadow-hand">
                  {PUBLISH_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setPublishOpen(false)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink/5"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{t(item.label)}</span>
                          <span className="block truncate text-xs text-ink/50">{t(item.desc)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isLoading && (isAuthenticated && user ? (
            <div className="ml-2 flex items-center gap-1">
              {/* 通知铃铛（登录后显示，60 秒轮询） */}
              <NotificationBell />
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <span className="hidden text-sm font-medium lg:inline">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                title={t('退出登录')}
                className="rounded-lg p-2 transition-colors hover:bg-ink/5"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/auth/login" className="ml-2">
              <Button size="sm">{t('登录')}</Button>
            </Link>
          ))}
        </nav>

        {/* ============ 移动端顶栏操作区（桌面隐藏） ============
            顶栏只留高频操作：发布（登录时）、通知（登录时）、菜单按钮 */}
        <div className="ml-auto flex items-center gap-0.5 lg:hidden">
          {!isLoading && isAuthenticated && (
            <Link
              href="/create"
              className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5"
            >
              <Plus className="h-4 w-4" />
              {t('发布')}
            </Link>
          )}
          {!isLoading && isAuthenticated && <NotificationBell />}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t('打开菜单')}
            title={t('打开菜单')}
            className="rounded-lg p-2 transition-colors hover:bg-ink/5"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* 主题切换 + 语言切换（桌面端固定在最右；移动端移入抽屉（见下方），
            单一实例 + 抽屉内实例在打开时重建，保证图标状态始终一致） */}
        <div className="ml-0.5 hidden items-center gap-1 lg:flex">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      {/* ============ 移动端抽屉菜单（<lg 显示） ============
          修复：抽屉用 createPortal 挂载到 <body>。
          <header> 带 backdrop-blur（backdrop-filter），会给 fixed 后代建立包含块，
          导致遮罩/面板被限制在顶栏高度内（手机端打开菜单时抽屉被顶栏遮住/裁切）。
          挂到 body 后 fixed 重新相对视口定位，抽屉恢复全屏高度。 */}
      {mobileOpen &&
        createPortal(
          <>
          {/* 遮罩：点击关闭 */}
          <div
            className="animate-fade-in fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* 侧滑面板 */}
          <div className="animate-drawer-in fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-ink/10 bg-surface shadow-hand lg:hidden">
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <span className="hand-title text-lg text-ink">{t('🌿 菜单')}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t('关闭菜单')}
                className="rounded-lg p-2 transition-colors hover:bg-ink/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">              {/* 用户区 */}
              {!isLoading && (isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={user.name} src={user.avatar} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{user.name}</span>
                      <span className="block text-xs text-ink/50">
                        {user.handle ? `@${user.handle}` : t('已登录')}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title={t('退出登录')}
                    className="rounded-lg p-2 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block">
                  <Button className="w-full">{t('登录 / 注册')}</Button>
                </Link>
              ))}

              {/* 发布区（登录后显示，移动端展开为列表） */}
              {!isLoading && isAuthenticated && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/50">{t('发布')}</p>
                  <div className="space-y-1">
                    {PUBLISH_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink/5"
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink">{t(item.label)}</span>
                            <span className="block truncate text-xs text-ink/50">{t(item.desc)}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 导航区 */}
              <div>
                <p className="mb-2 text-xs font-medium text-ink/50">{t('导航')}</p>
                <div className="space-y-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5',
                        pathname === item.href && 'bg-ink/10'
                      )}
                    >
                      {t(item.label)}
                    </Link>
                  ))}
                  {!isLoading && isAuthenticated && user?.role === 'admin' && (
                    <Link
                      href="/admin/members"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5',
                        pathname.startsWith('/admin') && 'bg-ink/10'
                      )}
                    >
                      {t('管理')}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 抽屉底部：主题 / 语言切换（移动端入口） */}
            <div className="border-t border-ink/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink/60">{t('外观')}</span>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>
            </div>
          </div>
          </>,
          document.body
        )}
    </header>
  );
}
