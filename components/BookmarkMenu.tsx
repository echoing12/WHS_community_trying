'use client';

import { useEffect, useState } from 'react';
import { Bookmark, FolderPlus, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createCollection,
  fetchCollectionItems,
  fetchMyCollections,
  toggleNodeBookmark,
  togglePostBookmark,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CollectionItem } from '@/lib/api';

// 收藏按钮 + 收藏夹选择器（帖子 / 知识库详情共用）：
// 点击展开「我的收藏夹」列表，选择加入/移出；底部可新建收藏夹。
export default function BookmarkMenu({
  kind, // 'post' | 'node'
  itemId,
  initiallyCollected,
  onChange,
  className,
}: {
  kind: 'post' | 'node';
  itemId: string;
  initiallyCollected: boolean;
  onChange?: (collected: boolean) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [collected, setCollected] = useState(initiallyCollected);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [markOfItem, setMarkOfItem] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const toggle = kind === 'post' ? togglePostBookmark : toggleNodeBookmark;

  // 打开时拉取我的收藏夹，并确认当前内容在哪些收藏夹里
  const openMenu = async () => {
    setOpen((v) => !v);
    if (open || loading) return;
    setLoading(true);
    try {
      const list = await fetchMyCollections();
      setCollections(list);
      const marks = new Set<string>();
      for (const c of list) {
        const { posts, library_pages } = await fetchCollectionItems(c.slug);
        const found = kind === 'post' ? posts.some((p) => p.id === itemId) : library_pages.some((n) => n.id === itemId);
        if (found) marks.add(c.slug);
      }
      setMarkOfItem(marks);
      setCollected(marks.size > 0);
    } catch {
      // 忽略加载失败，仍可新建收藏夹
    } finally {
      setLoading(false);
    }
  };

  const toggleInCollection = async (mark: string) => {
    const inIt = markOfItem.has(mark);
    try {
      await toggle(itemId, !inIt, mark);
      const next = new Set(markOfItem);
      if (inIt) next.delete(mark);
      else next.add(mark);
      setMarkOfItem(next);
      setCollected(next.size > 0);
      onChange?.(next.size > 0);
    } catch {
      // 401/403/400 已由拦截器统一提示
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const c = await createCollection(newName.trim());
      setCollections((prev) => [...prev, c]);
      setNewName('');
      // 新建后直接加入当前内容
      await toggle(itemId, true, c.slug);
      setMarkOfItem((prev) => new Set(prev).add(c.slug));
      setCollected(true);
      onChange?.(true);
    } catch {
      // 拦截器已提示
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={openMenu}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border-2 border-dashed border-ink/60 px-5 py-2 text-sm font-bold transition-colors hover:bg-butter active:scale-95',
          collected && 'border-ink bg-butter'
        )}
      >
        <Bookmark className={cn('h-4 w-4 transition-transform', collected && 'fill-ink')} />
        {collected ? '已收藏' : '收藏'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-72 rounded-2xl border-2 border-dashed border-ink bg-surface p-3 shadow-hand">
            <p className="mb-2 text-xs font-bold text-ink/50">加入收藏夹：</p>
            {loading ? (
              <p className="flex items-center gap-2 py-3 text-sm text-ink/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中…
              </p>
            ) : collections.length === 0 ? (
              <p className="py-2 text-sm text-ink/50">还没有收藏夹，先新建一个吧</p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleInCollection(c.slug)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-butter',
                      markOfItem.has(c.slug) && 'bg-butter'
                    )}
                  >
                    <Bookmark
                      className={cn('h-4 w-4 shrink-0', markOfItem.has(c.slug) && 'fill-ink')}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-medium text-ink/40">{c.item_count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 新建收藏夹 */}
            <div className="mt-3 flex gap-2 border-t-2 border-dashed border-ink/20 pt-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="新建收藏夹名称…"
                className="h-9 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                新建
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-ink/40">
              <FolderPlus className="h-3 w-3" />
              在「收藏夹」页面可管理全部收藏夹
            </p>
          </div>
        </>
      )}
    </div>
  );
}
