'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearLocalSession, fetchSession, logout as apiLogout } from '@/lib/api';
import { flushExpiredKicks } from '@/lib/kicks';
import type { User } from '@/types';

// ============ 全局认证状态（基于Storyden官方规格: Cookie 会话认证） ============
// - 应用启动时（layout.tsx 挂载 AuthProvider）调用 GET /api/session 检测会话
// - isAuthenticated / user / isLoading 供全站写操作按钮的条件渲染使用
// - 会话 Cookie（storyden-session）由后端 Set-Cookie 下发，前端只读状态

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 刷新认证状态：GET /api/session（真实 StoryDen 会话检测）
  // fetchSession 语义：null = 确定未登录；抛异常 = 网络/后端错误（未知状态）。
  // 网络错误时保持现有认证状态 —— 否则后端短暂不可达（重启/网络抖动）会把
  // 已登录用户误登出，写操作按钮全部消失且不会自动恢复。
  const refresh = useCallback(async () => {
    try {
      const session = await fetchSession();
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
    } catch {
      // 网络/后端错误：保持现有状态不动
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 退出登录：POST /api/auth/logout（服务端使会话失效）+ 清理本地残留状态
  //（clearLocalSession 与拦截器共用同一份 cookie 清单，见 lib/api/shared.ts）
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // 后端不可达时忽略网络错误，继续本地清理
    }
    clearLocalSession();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // 应用启动时检测会话状态
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 窗口重新获得焦点时重新验证会话（节流 30s）：
  // 被管理员移出社区 / 会话在后台过期时，切回页面立即同步 UI（显示未登录），
  // 而不是等到下次写操作 401 才被跳转
  const lastFocusCheck = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusCheck.current < 30_000) return;
      lastFocusCheck.current = now;
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // 管理员：踢出到期自动解封（见 lib/kicks.ts）。
  // 挂载时立即执行一次 + 每 10 分钟轮询；Storyden 封禁无时长参数，
  // 到期解封依赖本浏览器在线（本地站点管理员电脑通常常开）。
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    void flushExpiredKicks();
    const timer = setInterval(() => void flushExpiredKicks(), 10 * 60_000);
    return () => clearInterval(timer);
  }, [isAuthenticated, user?.role]);

  const value = useMemo(
    () => ({ isAuthenticated, user, isLoading, refresh, logout }),
    [isAuthenticated, user, isLoading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}
