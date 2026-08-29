import * as React from 'react';
import { cn } from '@/lib/utils';

// ============ 克制风格输入框 ============
// 方框圆角框：1px 实线描边，聚焦时深墨绿细描边 + 柔和光晕
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg border border-ink/15 bg-surface px-4 text-sm text-ink transition-colors placeholder:text-ink/40 focus:border-ink-solid/50 focus:outline-none focus:ring-2 focus:ring-ink-solid/15',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
