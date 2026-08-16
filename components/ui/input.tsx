import * as React from 'react';
import { cn } from '@/lib/utils';

// 手绘风输入框：圆角 + 虚线边框，聚焦时墨绿描边 + 淡黄光晕
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border-2 border-dashed border-ink/60 bg-surface px-4 text-sm font-medium placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-butter',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
