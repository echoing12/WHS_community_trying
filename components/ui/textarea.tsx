import * as React from 'react';
import { cn } from '@/lib/utils';

// 克制风格多行文本框（方框圆角框 + 1px 实线描边）
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-ink/15 bg-surface px-4 py-3 text-sm text-ink transition-colors placeholder:text-ink/40 focus:border-ink-solid/50 focus:outline-none focus:ring-2 focus:ring-ink-solid/15',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
