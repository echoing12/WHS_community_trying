'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, SearchX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/useLang';
import { fetchFollowList } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Member } from '@/types';

// 粉丝 / 关注列表（GET /api/profiles/{handle}/followers|following）
export default function FollowList({ type }: { type: 'followers' | 'following' }) {
  const params = useParams<{ id: string }>();
  const t = useT();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError('');
    try {
      setMembers(await fetchFollowList(params.id, type));
    } catch {
      setError(
        type === 'followers'
          ? t('粉丝列表加载失败，请检查网络后重试')
          : t('关注列表加载失败，请检查网络后重试')
      );
    } finally {
      setLoading(false);
    }
  }, [params.id, type, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* 返回成员主页 */}
      <Link
        href={`/members/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('返回成员主页')}
      </Link>

      <h1 className="hand-title text-2xl text-ink lg:text-3xl">
        {type === 'followers' ? t('👥 粉丝') : t('👥 关注')}
        <span className="ml-2 text-sm text-ink/50">{t('（{n}）', { n: members.length })}</span>
      </h1>

      {loading ? (
        <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>
      ) : error ? (
        <div className="hand-card p-10 text-center">
          <p className="font-medium">{error}</p>
          <Button className="mt-4" onClick={load}>
            {t('重试')}
          </Button>
        </div>
      ) : members.length === 0 ? (
        <div className="hand-card flex flex-col items-center gap-2 p-10 text-center">
          <SearchX className="h-6 w-6 text-ink/40" />
          <p className="font-medium">
            {type === 'followers' ? t('还没有粉丝') : t('还没有关注任何人')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className="group block">
              <article className="hand-card flex items-center gap-4 p-4 transition-transform duration-200 group-hover:-translate-y-0.5">
                <Avatar name={member.name} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="hand-title truncate text-lg text-ink group-hover:underline">
                    {member.name}
                  </h3>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink/60">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('注册于 {date}', { date: member.joined_at ? formatDate(member.joined_at) : '—' })}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* 免责声明 */}
      <p className="border-t border-ink/10 pt-4 text-center text-xs text-ink/50">
        {t('成员信息仅供社区内部交流使用，请勿在站外传播；本社区仅供 WHS 患者交流，不构成医疗建议')}
      </p>
    </div>
  );
}
