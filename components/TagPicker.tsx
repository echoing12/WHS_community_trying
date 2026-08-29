'use client';

import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, Plus, Tag } from 'lucide-react';
import { fetchTags } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// 标签多选下拉（无第三方依赖，纯自绘；标签列表来自真实 API：GET /api/tags）
// 支持两种方式：点击选择已有标签，或输入新标签名（回车 / 点「添加」创建）——
// Storyden 的标签随内容自动创建，发布时把新标签名传给后端即可。
export default function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const t = useT();

  // 真实标签列表（GET /api/tags）；接口异常时允许手动输入场景下为空列表
  useEffect(() => {
    fetchTags()
      .then((tags) => setAllTags(tags.map((t) => t.name)))
      .catch(() => setAllTags([]));
  }, []);

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  };

  // 添加新标签：同名（不区分大小写）不重复；已存在但未选中的直接选中
  const addNewTag = () => {
    const name = newTag.trim();
    if (!name) return;
    const existing = allTags.find((t) => t.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!value.includes(existing)) onChange([...value, existing]);
    } else {
      onChange([...value, name]);
      setAllTags((prev) => [...prev, name]);
    }
    setNewTag('');
  };

  // 回车添加；isComposing 过滤中文输入法确认候选词时的回车
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      addNewTag();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-ink/15 bg-surface px-4 py-2.5 text-left text-sm font-medium transition-colors hover:border-ink/30"
      >
        <Tag className="h-4 w-4 shrink-0 text-ink/60" />
        <span className={cn('flex-1 truncate', value.length === 0 && 'text-ink/50')}>
          {value.length === 0 ? t('选择标签（可多选）') : value.join('、')}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink/60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-ink/10 bg-surface p-4 shadow-hand">
          {/* 新建标签输入框（回车或点「添加」） */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={30}
              placeholder={t('输入新标签名，回车创建')}
              className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-ink/40 focus:border-ink-solid/50"
            />
            <button
              type="button"
              onClick={addNewTag}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink/30 hover:bg-ink/5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('添加')}
            </button>
          </div>

          <p className="mb-3 text-xs font-medium text-ink/50">{t('点击选择已有标签：')}</p>
          {allTags.length === 0 ? (
            <p className="text-sm text-ink/50">{t('暂无已有标签，输入名称即可创建新标签')}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm font-medium transition-colors hover:bg-ink/5',
                  value.includes(tag)
                    ? 'border-ink-solid bg-ink-solid text-on-solid hover:bg-ink-solid'
                    : 'border-ink/15 text-ink'
                )}
              >
                {value.includes(tag) ? '✓ ' : ''}
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
