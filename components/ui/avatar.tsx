import * as React from 'react';
import { cn } from '@/lib/utils';

// 手绘风头像：
// - 有图片：显示图片
// - 无图片：显示姓名首字，背景色由姓名哈希决定（保证同一个人颜色稳定）
const PALETTE = [
  'bg-butter text-ink',
  'bg-ink-solid text-on-solid',
  'bg-emerald-200 text-ink',
  'bg-sky-200 text-ink',
  'bg-rose-200 text-ink',
];

function colorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return PALETTE[hash % PALETTE.length];
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
} as const;

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-ink/70',
        colorOf(name),
        SIZES[size],
        className
      )}
    >
      {src ? (
        // 图片上传后为 dataURL，无需 next/image 优化
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{name?.[0] ?? '?'}</span>
      )}
    </div>
  );
}
