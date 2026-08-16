import * as React from 'react';
import { cn } from '@/lib/utils';

// 手绘风多行文本框
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-2xl border-2 border-dashed border-ink/60 bg-surface px-4 py-3 text-sm font-medium placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-butter',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
