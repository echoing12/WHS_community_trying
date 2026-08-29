'use client';

import { useLang } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// 语言切换按钮：中文界面显示「EN」，英文界面显示「中」。
// 与主题切换并列放在顶栏；移动端移入抽屉。
export default function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      title={lang === 'zh' ? 'English' : '中文'}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换为中文'}
      className={cn(
        'rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-ink/70 transition-colors hover:border-ink/30 hover:bg-ink/5',
        className
      )}
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
}
