'use client';

import Link from 'next/link';
import { ArrowUpRight, LinkIcon, Plus } from 'lucide-react';
import useSWR from 'swr';
import LoginHint from '@/components/LoginHint';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useLang';
import { fetchLinks } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function LinksPage() {
  // 基于Storyden官方规格: 提交链接属写操作，按登录状态动态显示
  const { isAuthenticated, isLoading } = useAuth();
  const t = useT();
  // 链接列表：SWR 缓存（60 秒内不重复请求）
  const { data: links = [], error, isLoading: linksLoading, mutate } = useSWR(
    'links',
    fetchLinks,
    { dedupingInterval: 60_000 }
  );
  const loading = linksLoading && links.length === 0;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <section className="hand-card flex flex-col items-center gap-4 p-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div>
          <h1 className="hand-title text-2xl text-ink lg:text-3xl">{t('🔗 链接分享')}</h1>
          <p className="mt-2 text-ink/70">
            {t('收藏值得信赖的外部资料：基金会官网、研究文献、照护指南。分享前请确保内容安全可靠。')}
          </p>
        </div>
        {!isLoading && (isAuthenticated ? (
          <Link href="/links/submit">
            <Button>
              <Plus className="h-4 w-4" />
              {t('提交链接')}
            </Button>
          </Link>
        ) : (
          <LoginHint redirect="/links/submit" />
        ))}
      </section>

      {/* 链接列表 */}
      {loading ? (
        <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>
      ) : error ? (
        <div className="hand-card p-10 text-center">
          <p className="font-medium">{t('链接加载失败，请检查网络后重试')}</p>
          <Button className="mt-4" onClick={() => mutate()}>
            {t('重试')}
          </Button>
        </div>
      ) : links.length === 0 ? (
        <div className="hand-card p-10 text-center">
          <p className="font-medium">{t('还没有人分享链接')}</p>
          <p className="mt-2 text-sm text-ink/60">{t('来分享第一个有价值的资料吧！')}</p>
          {!isLoading && (isAuthenticated ? (
            <Link href="/links/submit" className="mt-4 inline-block">
              <Button>{t('去分享')}</Button>
            </Link>
          ) : (
            <div className="mt-4">
              <LoginHint redirect="/links/submit" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <article key={link.id} className="hand-card p-5">
              <div className="flex items-start gap-4">
                {/* OG 图片：无图时显示域名首字占位块 */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('打开 {domain}', { domain: link.domain })}
                  className="shrink-0"
                >
                  <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-butter/50 transition-transform hover:-translate-y-0.5 sm:h-24 sm:w-36">
                    {link.image ? (
                      // 真实接口返回 OG 图片（primary_image.path）
                      <img src={link.image} alt={link.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="hand-title text-2xl text-ink/70 sm:text-3xl">
                        {link.domain[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                </a>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hand-title min-w-0 flex-1 truncate text-lg text-ink hover:underline"
                      title={link.url}
                    >
                      {link.title}
                    </a>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/40" />
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink/70">
                    {link.description}
                  </p>

                  {/* 真实 API 的 Link 没有标签字段（tags），有标签时再展示 */}
                  {link.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {link.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink/60">
                    {/* 真实 API 的 Link 没有作者/发布时间字段，仅在接口提供时展示 */}
                    {link.author.name && link.author.name !== t('社区成员') && (
                      <>
                        <Avatar name={link.author.name} src={link.author.avatar} size="sm" />
                        <span className="font-medium">{link.author.name}</span>
                        <span className="text-ink/40">·</span>
                      </>
                    )}
                    {link.created_at && (
                      <>
                        <span>{formatRelativeTime(link.created_at)}</span>
                        <span className="text-ink/40">·</span>
                      </>
                    )}
                    <span className="max-w-[12rem] truncate font-medium text-ink/50">
                      {link.domain}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 免责声明 */}
      <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
        {t('链接内容来自第三方网站，社区不对其准确性负责；本社区仅供 WHS 患者交流，不构成医疗建议')}
      </p>
    </div>
  );
}
