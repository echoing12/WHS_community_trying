import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============ 克制风格按钮 ============
// 方框圆角框：1px 实线描边 + 中圆角；hover 仅轻微加深，不用亮色填充
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-solid/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-ink/15 bg-transparent text-ink hover:border-ink/30 hover:bg-ink/5',
        solid: 'border-ink-solid bg-ink-solid text-on-solid hover:bg-ink-solid/90',
        ghost: 'border-transparent hover:bg-ink/5',
      },
      size: {
        default: 'px-5 py-2.5 text-sm',
        sm: 'px-4 py-1.5 text-xs',
        lg: 'px-7 py-3.5 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
