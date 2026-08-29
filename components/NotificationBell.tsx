'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Heart, Loader2, MessageCircle, Reply, UserPlus, AtSign } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { fetchNotifications, markNotificationRead } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { NotificationItem } from '@/lib/api';

// 通知事件 → 文案与图标（StoryDen NotificationEvent 枚举）
const EVENT_META: Record<string, { text: string; icon: React.ComponentType<{ className?: string }> }> = {
  thread_reply: { text: '回复了你的帖子', icon: MessageCircle },
  reply_to_reply: { text: '回复了你的评论', icon: Reply },
  post_like: { text: '赞了你的帖子', icon: Heart },
  follow: { text: '关注了你', icon: UserPlus },
  profile_mention: { text: '提及了你', icon: AtSign },
  node_version_created: { text: '提交了知识库更新', icon: MessageCircle },
  node_version_applied: { text: '知识库内容已更新', icon: MessageCircle },
};

function eventMeta(event: string): { text: string; icon: React.ComponentType<{ className?: string }> } {
  return EVENT_META[event] ?? { text: '有新动态', icon: MessageCircle };
}

// 通知条目 → 跳转地址（帖子 / 知识库 / 成员）
// item_id 在 api.ts 已归一化：回复类通知映射为所属帖子的 id（root_id），关注类为成员 handle
function notificationHref(n: NotificationItem): string {
  if (n.item_kind === 'node') return `/library/${n.item_slug ?? n.item_id}`;
  if (n.item_kind === 'profile') return `/members/${n.item_id}`;
  // 兜底：无有效帖子标识时不跳转（避免 /post/undefined）
  if (!n.item_id) return '#';
  return `/post/${n.item_id}`;
}

// 通知铃铛：登录后显示，60 秒轮询 GET /api/notifications，未读数红点 + 下拉列表
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useT();

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    try {
      const list = await fetchNotifications();
      setNotifications(list);
      setUnread(list.filter((n) => n.status === 'unread').length);
    } catch {
      // 网络异常静默忽略，下轮重试
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // 轮询：每 60 秒静默刷新未读数
    timerRef.current = setInterval(() => load(true), 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  // 打开下拉时刷新一次
  const toggle = () => {
    setOpen((v) => {
      if (!v) load(true);
      return !v;
    });
  };

  // 点击通知：跳转并标记已读
  const handleClick = async (n: NotificationItem) => {
    if (n.status === 'unread') {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: 'read' } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title={t('通知')}
        className="relative rounded-lg p-2 transition-colors hover:bg-ink/5"
      >
        <Bell className={cn('h-4 w-4', refreshing && 'animate-pulse')} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-ink/10 bg-surface p-2 shadow-hand">
            <p className="mb-1 px-3 py-1.5 text-sm font-medium text-ink">{t('通知')}</p>
            {loading ? (
              <p className="flex items-center gap-2 px-3 py-6 text-sm text-ink/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('加载中…')}
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink/50">{t('还没有通知')}</p>
            ) : (
              <div className="max-h-80 space-y-0.5 overflow-y-auto">
                {notifications.slice(0, 30).map((n) => {
                  const meta = eventMeta(n.event);
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={n.id}
                      href={notificationHref(n)}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink/5',
                        n.status === 'unread' && 'bg-ink/5'
                      )}
                    >
                      <Avatar name={n.source_name ?? '?'} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">
                          <span className="font-medium">{n.source_name ?? n.source_handle ?? t('有人')}</span>{' '}
                          {t(meta.text)}
                          {n.item_title ? `：「${n.item_title.slice(0, 20)}${n.item_title.length > 20 ? '…' : ''}」` : ''}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
                          <Icon className="h-3 w-3" />
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </span>
                      {n.status === 'unread' && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
