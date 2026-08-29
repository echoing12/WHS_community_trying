'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, PencilLine, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// 内容操作菜单（编辑 / 删除），作者本人或管理员可见（基于Storyden官方规格权限模型：
// 管理员可管理任意内容；role 由会话接口的 account.admin 映射）。
// 供帖子卡片、帖子详情、知识库详情共用；点击删除弹确认框。
export default function ContentActions({
  isAuthor,
  editHref,
  onDelete,
  deletePrompt = '确定要删除吗？删除后无法恢复。',
  deleteLabel = '删除',
  className,
}: {
  isAuthor: boolean;
  editHref: string;
  onDelete: () => Promise<void> | void;
  deletePrompt?: string;
  deleteLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 作者本人或管理员可见（管理员可管理任意内容）
  const canManage = isAuthor || user?.role === 'admin';
  if (!canManage) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (!window.confirm(t(deletePrompt))) return;
    setDeleting(true);
    try {
      await onDelete();
      router.push('/');
    } catch {
      // 401/403/400 已由拦截器统一提示
      setDeleting(false);
    }
  };

  return (
    <div className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        title={t('更多操作')}
        className="rounded-lg p-1.5 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          {/* 点击空白处关闭 */}
          <div className="fixed inset-0 z-30" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 z-40 mt-1 w-40 rounded-xl border border-ink/10 bg-surface p-1.5 shadow-hand">
            <Link
              href={editHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              <PencilLine className="h-4 w-4" />
              {t('编辑')}
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-ink/5 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? t('删除中…') : t(deleteLabel)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
