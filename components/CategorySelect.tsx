'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { fetchCategories } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CategoryItem } from '@/types';

// 分类下拉（纯自绘，同 TagPicker 风格；数据来自 GET /api/categories）
export default function CategorySelect({
  value,
  onChange,
}: {
  value: string; // 分类 id，空字符串表示不分类
  onChange: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const selected = categories.find((c) => c.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-ink/60 bg-surface px-4 py-2.5 text-left text-sm font-medium transition-colors hover:border-ink"
      >
        <FolderOpen className="h-4 w-4 shrink-0 text-ink/60" />
        <span className={cn('flex-1 truncate', !value && 'text-ink/50')}>
          {selected ? selected.name : '选择分类（可选）'}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink/60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border-2 border-dashed border-ink bg-surface p-2 shadow-hand">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={cn(
              'w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-butter',
              !value && 'bg-butter'
            )}
          >
            不分类
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-butter',
                value === c.id && 'bg-butter'
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-ink/40"
                style={{ backgroundColor: c.colour || '#f9d56e' }}
              />
              <span className="flex-1 truncate">{c.name}</span>
              {typeof c.postCount === 'number' && (
                <span className="text-xs font-medium text-ink/40">{c.postCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
