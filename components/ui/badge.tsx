import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 手绘风标签：圆角胶囊 + 虚线边框
const badgeVariants = cva(
  'inline-flex items-center rounded-full border-2 border-dashed px-3 py-0.5 text-xs font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-ink/70 text-ink',
        butter: 'border-ink bg-butter text-ink',
        ink: 'border-ink bg-ink-solid text-on-solid',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
