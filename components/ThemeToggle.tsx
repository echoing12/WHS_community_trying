'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'whs-theme';

// 主题切换按钮：class 切换（<html class="dark">）+ localStorage 持久化。
// 首次访问跟随系统偏好（prefers-color-scheme）。
export default function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // 初始化：localStorage > 系统偏好
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
  }, []);

  const toggle = () => {
    setDark((v) => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? t('切换到浅色模式') : t('切换到深色模式')}
      className={cn('rounded-lg p-2 transition-colors hover:bg-ink/5', className)}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
