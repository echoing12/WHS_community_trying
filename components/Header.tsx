'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, ChevronDown, LinkIcon, LogOut, PenLine, Plus } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ============ 新增开始：导航项（知识库 / 链接 / 用户 / 标签 / 发布下拉） ============
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
// ============ 新增结束 ============

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  // 基于Storyden官方规格: 登录状态统一由 useAuth 管理
  // （GET /api/session 检测会话），不再直接读取本地 cookie
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  // ============ 新增开始：发布下拉菜单状态（点击外部自动收起） ============
  const [publishOpen, setPublishOpen] = useState(false);
  const publishRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (publishRef.current && !publishRef.current.contains(e.target as Node)) {
        setPublishOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  // ============ 新增结束 ============

  // 基于Storyden官方规格: 退出登录 → POST /api/auth/logout（useAuth 内清除本地状态）
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b-2 border-dashed border-ink/30 bg-mint/90 backdrop-blur">
      {/* max-w-5xl（原 max-w-4xl）: 加入「管理」入口后导航项增多，4xl 宽度会换行错位，
          放宽一行容纳全部导航项（内容区仍为 max-w-4xl，视觉上导航略宽属正常） */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link href="/" className="hand-title text-xl text-ink">
          🌿 WHS 互助社区
        </Link>

        {/* 导航 + 发布下拉 + 用户区 */}
        <nav className="ml-auto flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-bold transition-colors hover:bg-butter lg:px-4',
                pathname === item.href && 'bg-butter'
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* 账号管理（仅管理员可见；/api/admin/accounts 等服务端接口也只有管理员可调用） */}
          {!isLoading && isAuthenticated && user?.role === 'admin' && (
            <Link
              href="/admin/members"
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-bold transition-colors hover:bg-butter lg:px-4',
                pathname.startsWith('/admin') && 'bg-butter'
              )}
            >
              管理
            </Link>
          )}

          {/* ============ 新增开始：发布下拉菜单（基于Storyden官方规格权限模型） ============
              发布帖 / 写知识库 / 提交链接均属写操作，Guest（未登录）不可见 */}
          {!isLoading && isAuthenticated && (
            <div ref={publishRef} className="relative ml-1">
              <button
                onClick={() => setPublishOpen((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition-colors hover:bg-butter lg:px-4',
                  publishOpen && 'bg-butter'
                )}
              >
                <Plus className="h-4 w-4" />
                发布
                <ChevronDown
                  className={cn('h-3.5 w-3.5 text-ink/60 transition-transform', publishOpen && 'rotate-180')}
                />
              </button>

              {publishOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border-2 border-dashed border-ink bg-surface p-2 shadow-hand">
                  {PUBLISH_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setPublishOpen(false)}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-butter"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-ink">{item.label}</span>
                          <span className="block truncate text-xs text-ink/50">{item.desc}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* ============ 新增结束 ============ */}

          {/* 主题切换（深色 / 浅色，始终可用） */}
          <ThemeToggle className="ml-1" />

          {!isLoading && (isAuthenticated && user ? (
            <div className="ml-2 flex items-center gap-1">
              {/* 通知铃铛（登录后显示，60 秒轮询） */}
              <NotificationBell />
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <span className="hidden text-sm font-bold lg:inline">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                title="退出登录"
                className="rounded-full p-2 transition-colors hover:bg-butter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/auth/login" className="ml-2">
              <Button size="sm">登录</Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
