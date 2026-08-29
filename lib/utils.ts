import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLangGlobal, translate, type Lang } from '@/lib/i18n';

// 合并 Tailwind 类名（shadcn/ui 标准工具）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 相对时间（跟随当前语言）："刚刚" / "3 小时前" ↔ "just now" / "3h ago"
export function formatRelativeTime(iso: string, lang?: Lang): string {
  const l = lang ?? getLangGlobal();
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return translate(l, '刚刚');
  if (minutes < 60) return translate(l, '{n} 分钟前', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate(l, '{n} 小时前', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return translate(l, '{n} 天前', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return translate(l, '{n} 个月前', { n: months });
  return translate(l, '{n} 年前', { n: Math.floor(months / 12) });
}

// 完整日期：中文 "2023 年 5 月 12 日" / 英文 "May 12, 2023"
export function formatDate(iso: string, lang?: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const l = lang ?? getLangGlobal();
  return date.toLocaleDateString(l === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
