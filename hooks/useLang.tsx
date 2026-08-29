'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  setLangGlobal,
  STORAGE_KEY,
  translate,
  type Lang,
} from '@/lib/i18n';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
});

// 语言提供者：localStorage 持久化（键 whs-lang），首次访问跟随浏览器语言。
// 与主题切换同一模式；切换时同步 document.documentElement.lang 与模块级语言。
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  useEffect(() => {
    let initial: Lang = 'zh';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zh') {
        initial = saved;
      } else if (navigator.language?.toLowerCase().startsWith('en')) {
        initial = 'en';
      }
    } catch {
      // localStorage 不可用（隐私模式等）时保持默认中文
    }
    setLangState(initial);
    setLangGlobal(initial);
    document.documentElement.lang = initial === 'en' ? 'en' : 'zh-CN';
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLangGlobal(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

// 页面组件取翻译函数：const t = useT();
export function useT() {
  return useContext(LangContext).t;
}

// 需要读写语言状态（如切换按钮）时用
export function useLang() {
  return useContext(LangContext);
}
