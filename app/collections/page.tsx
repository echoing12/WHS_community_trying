'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, PencilLine, Plus, Trash2 } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createCollection,
  deleteCollection,
  fetchMyCollections,
  updateCollection,
} from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import type { CollectionItem } from '@/lib/api';

// 收藏夹管理（真实 API：GET/POST/PATCH/DELETE /api/collections）
export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新建表单
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // 编辑表单（mark → 编辑中的收藏夹）
  const [editing, setEditing] = useState<CollectionItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCollections(await fetchMyCollections());
    } catch {
      setError('收藏夹加载失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCollection(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await load();
    } catch {
      // 拦截器已提示
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateCollection(editing.slug, { name: editName.trim(), description: editDesc.trim() });
      setEditing(null);
      await load();
    } catch {
      // 拦截器已提示
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CollectionItem) => {
    if (!window.confirm(`确定删除收藏夹「${c.name}」吗？收藏夹本身会被删除，内容不受影响。`)) return;
    try {
      await deleteCollection(c.slug);
      await load();
    } catch {
      // 拦截器已提示
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h1 className="hand-title text-2xl text-ink lg:text-3xl">🔖 我的收藏夹</h1>
            <p className="mt-2 text-ink/70">把有用的帖子和知识库页面分类收藏，方便随时回看。</p>
          </div>
          <Button onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" />
            新建收藏夹
          </Button>
        </section>

        {/* 新建表单 */}
        {showCreate && (
          <div className="hand-card space-y-3 p-5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="收藏夹名称（如：康复资料）"
              maxLength={30}
            />
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="描述（可选）"
              rows={2}
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setShowCreate(false)}>
                取消
              </Button>
              <Button size="sm" variant="solid" onClick={handleCreate} disabled={creating || !newName.trim()}>
                创建
              </Button>
            </div>
          </div>
        )}

        {/* 收藏夹列表 */}
        {loading ? (
          <p className="py-16 text-center text-ink/50">加载中…</p>
        ) : error ? (
          <div className="hand-card p-10 text-center">
            <p className="font-bold">{error}</p>
            <Button className="mt-4" onClick={load}>
              重试
            </Button>
          </div>
        ) : collections.length === 0 ? (
          <div className="hand-card p-10 text-center">
            <p className="font-bold">还没有收藏夹</p>
            <p className="mt-2 text-sm text-ink/60">点右上角「新建收藏夹」，开始分类收藏吧！</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {collections.map((c) =>
              editing?.id === c.id ? (
                <div key={c.id} className="hand-card space-y-3 p-5">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="收藏夹名称"
                    maxLength={30}
                  />
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="描述（可选）"
                    rows={2}
                    maxLength={100}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => setEditing(null)}>
                      取消
                    </Button>
                    <Button size="sm" variant="solid" onClick={handleUpdate} disabled={saving || !editName.trim()}>
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="hand-card group p-5">
                  <Link href={`/collections/${c.slug}`} className="block">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 shrink-0 text-ink/60" />
                      <h3 className="hand-title min-w-0 flex-1 truncate text-lg text-ink group-hover:underline">
                        {c.name}
                      </h3>
                      <span className="rounded-full border-2 border-dashed border-ink/40 px-2 py-0.5 text-xs font-bold text-ink/50">
                        {c.item_count} 项
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink/60">{c.description}</p>
                    )}
                    <p className="mt-2 text-xs text-ink/40">创建于 {formatRelativeTime(c.created_at)}</p>
                  </Link>
                  <div className="mt-3 flex justify-end gap-1 border-t-2 border-dashed border-ink/20 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c);
                        setEditName(c.name);
                        setEditDesc(c.description ?? '');
                      }}
                      title="编辑收藏夹"
                      className="rounded-full p-1.5 text-ink/50 transition-colors hover:bg-butter hover:text-ink"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      title="删除收藏夹"
                      className="rounded-full p-1.5 text-ink/50 transition-colors hover:bg-butter hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* 免责声明 */}
        <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
          本社区仅供 WHS 患者交流，不构成医疗建议
        </p>
      </div>
    </AuthGuard>
  );
}
