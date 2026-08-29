import { cn } from '@/lib/utils';

// ============ 温馨装饰（克制使用） ============
// 浅淡的叶子 / 新芽线条装饰，用于页面空余处与空状态，
// 通过 currentColor + 低透明度呈现，不抢内容焦点。

export function LeafDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn('h-10 w-10', className)}
    >
      <path
        d="M50 6c-30 22-34 58-6 84 24-24 22-60 6-84Z"
        fill="currentColor"
      />
      <path
        d="M50 14c-16 20-20 46-8 72"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SproutDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn('h-10 w-10', className)}
    >
      <path
        d="M50 88V44"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M50 56c0-18 12-30 28-34-2 18-14 30-28 34Z"
        fill="currentColor"
      />
      <path
        d="M50 66c0-18-12-28-26-30 3 18 15 28 26 30Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export function HeartDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn('h-10 w-10', className)}
    >
      <path
        d="M50 84C28 66 14 52 14 35c0-12 9-20 19-20 8 0 14 5 17 11 3-6 9-11 17-11 10 0 19 8 19 20 0 17-14 31-36 49Z"
        fill="currentColor"
      />
    </svg>
  );
}
