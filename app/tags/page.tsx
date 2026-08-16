'use client';

import Link from 'next/link';
import { BookOpen, Hash, LinkIcon, MessageCircle } from 'lucide-react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { fetchTags } from '@/lib/api';

export default function TagsPage() {
  // 标签列表：SWR 缓存（60 秒内不重复请求）
  const { data: tagsData, isLoading } = useSWR('tags', fetchTags, { dedupingInterval: 60_000 });
  // 按使用频次从高到低排序
  const tags = [...(tagsData ?? [])].sort((a, b) => b.count - a.count);
  const loading = isLoading && tags.length === 0;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="hand-card p-8">
        <h1 className="hand-title text-2xl text-ink lg:text-3xl">🏷️ 全部标签</h1>
        <p className="mt-2 text-ink/70">
          按主题浏览社区全部内容：点击标签，聚合查看相关的帖子、知识库页面与链接。
        </p>
      </section>

      {/* 标签列表 */}
      {loading ? (
        <p className="py-16 text-center text-ink/50">加载中…</p>
      ) : tags.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-bold">还没有任何标签</p>
          <p className="mt-2 text-sm text-ink/60">发布内容时打上标签，方便大家按主题查找。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tags.map((tag) => (
            <Link key={tag.name} href={`/tags/${encodeURIComponent(tag.name)}`} className="group block">
              <article className="hand-card h-full p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-ink/60" />
                  <h3 className="hand-title flex-1 text-lg text-ink group-hover:underline">
                    {tag.name}
                  </h3>
                  <Badge variant="butter">{tag.count} 次使用</Badge>
                </div>

                {/* 分类计数（真实 API 只提供总使用频次 item_count，分类计数仅在有数据时展示） */}
                {(tag.posts_count > 0 || tag.library_count > 0 || tag.links_count > 0) && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-ink/60">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      帖子 {tag.posts_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      知识库 {tag.library_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      链接 {tag.links_count}
                    </span>
                  </div>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* 免责声明 */}
      <p className="border-t-2 border-dashed border-ink/20 pt-4 text-center text-xs text-ink/50">
        本社区仅供 WHS 患者交流，不构成医疗建议
      </p>
    </div>
  );
}
