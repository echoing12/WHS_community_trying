'use client';

import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import useSWR from 'swr';
import LibraryTree from '@/components/LibraryTree';
import LoginHint from '@/components/LoginHint';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { fetchLibraryTree } from '@/lib/api';

export default function LibraryPage() {
  // 基于Storyden官方规格: 写操作（写知识库页面）按登录状态动态显示
  const { isAuthenticated, isLoading } = useAuth();
  // 目录树：SWR 缓存（60 秒内不重复请求，进入页面秒开）
  const { data: nodes = [], error, isLoading: treeLoading, mutate } = useSWR(
    'library-tree',
    fetchLibraryTree,
    { dedupingInterval: 60_000 }
  );
  const loading = treeLoading && nodes.length === 0;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">📚 知识库</h1>
          <p className="mt-2 text-ink/70">
            由家长共同整理的知识手册：确诊、康复、照护与心理支持。每一页都来自真实经验。
          </p>
        </div>
        {!isLoading && (isAuthenticated ? (
          // 基于Storyden官方规格: Member 可提交知识库页面（SUBMIT_LIBRARY_NODE）
          <Link href="/library/create">
            <Button>
              <Plus className="h-4 w-4" />
              写知识库页面
            </Button>
          </Link>
        ) : (
          <LoginHint redirect="/library/create" />
        ))}
      </section>

      {/* 目录树 */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">📂 目录导航</h2>
        {loading ? (
          <p className="py-16 text-center text-ink/50">加载中…</p>
        ) : error ? (
          <div className="hand-card p-10 text-center">
            <p className="font-bold">知识库加载失败，请检查网络后重试</p>
            <Button className="mt-4" onClick={() => mutate()}>
              重试
            </Button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="hand-card p-10 text-center">
            <p className="font-bold">知识库还是空的</p>
            <p className="mt-2 text-sm text-ink/60">来写下第一篇知识库页面吧！</p>
            {!isLoading && (isAuthenticated ? (
              <Link href="/library/create" className="mt-4 inline-block">
                <Button>
                  <BookOpen className="h-4 w-4" />
                  开始创作
                </Button>
              </Link>
            ) : (
              <div className="mt-4">
                <LoginHint redirect="/library/create" />
              </div>
            ))}
          </div>
        ) : (
          <div className="hand-card p-5">
            <LibraryTree nodes={nodes} />
          </div>
        )}
      </section>

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        知识库内容由家长互助整理，仅供参考，不构成医疗建议；请以主治医生的意见为准
      </p>
    </div>
  );
}
