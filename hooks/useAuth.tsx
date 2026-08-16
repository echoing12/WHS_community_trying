'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { fetchSession, logout as apiLogout } from '@/lib/api';
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
  // 未登录 / 后端不可达统一返回 null → 未认证
  const refresh = useCallback(async () => {
    const session = await fetchSession();
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  // 退出登录：POST /api/auth/logout（服务端使会话失效）+ 清除本地残留状态
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // 后端不可达时忽略网络错误，继续本地清理
    }
    Cookies.remove('storyden_session');
    Cookies.remove('storyden-session');
    Cookies.remove('user_name');
    Cookies.remove('token');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // 应用启动时检测会话状态
  useEffect(() => {
    refresh();
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
