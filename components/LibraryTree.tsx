'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryNode } from '@/types';

// 知识库目录树（递归渲染；数据来自 lib/api.ts 的 fetchLibraryTree，即 GET /api/nodes）
// - 有子节点的节点 = 目录：点击展开 / 收起，展示子树
// - 无子节点的节点 = 页面：点击跳转 /library/[slug]

// 递归统计子树中的页面数（叶子数）
function countLeaves(node: LibraryNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function TreeNode({ node, depth }: { node: LibraryNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1); // 根层级默认展开
  const hasChildren = node.children.length > 0;

  // 目录节点：可展开 / 收起
  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-ink transition-colors hover:bg-butter"
        >
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 text-ink/60 transition-transform', open && 'rotate-90')}
          />
          {open ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-ink" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-ink" />
          )}
          <span className="flex-1 truncate">{node.title}</span>
          <span className="text-xs font-medium text-ink/40">
            {countLeaves(node)} 页
          </span>
        </button>

        {open && (
          <div className="ml-4 space-y-1 border-l-2 border-dashed border-ink/30 pl-4">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 页面节点：链接到详情页
  return (
    <Link
      href={`/library/${node.slug}`}
      className="group flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-butter"
    >
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
      <span className="min-w-0">
        <span className="font-bold group-hover:underline">{node.title}</span>
        {node.summary && (
          <span className="block truncate text-xs font-medium text-ink/50">{node.summary}</span>
        )}
      </span>
    </Link>
  );
}

export default function LibraryTree({ nodes }: { nodes: LibraryNode[] }) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
