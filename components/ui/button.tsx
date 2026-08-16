import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============ 手绘风按钮 ============
// 默认：透明背景 + 虚线边框，hover 时背景变为淡黄 #f9d56e
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-dashed font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-butter focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-ink bg-transparent text-ink hover:bg-butter',
        solid: 'border-ink bg-ink-solid text-on-solid hover:bg-ink-solid/90',
        ghost: 'border-transparent hover:bg-butter/50',
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
