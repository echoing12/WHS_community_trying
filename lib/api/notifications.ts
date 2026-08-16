// ============================================================
//  通知（StoryDen Notification 资源）
// ============================================================
import {
  api,
  type StorydenNode,
  type StorydenProfile,
  type StorydenReply,
  type StorydenThread,
} from './shared';

export interface NotificationItem {
  id: string;
  event: string;
  status: 'unread' | 'read';
  created_at: string;
  source_handle?: string;
  source_name?: string;
  item_kind?: string;
  item_id?: string;
  item_slug?: string;
  item_title?: string;
}

interface StorydenNotification {
  id: string;
  event: string;
  status: string;
  created_at: string;
  source?: { handle?: string; name?: string };
  item?: { kind?: string; ref?: unknown };
}

// 通知列表: GET /api/notifications（未读优先）
// 基于Storyden官方规格 DatagraphItem 判别器：kind 为 post / thread / reply / node / profile
export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get<{ notifications: StorydenNotification[] }>('/api/notifications');
  return (data.notifications ?? []).map((n) => {
    const kind = n.item?.kind ?? '';
    const item = n.item?.ref as
      | StorydenThread
      | StorydenNode
      | StorydenReply
      | StorydenProfile
      | undefined;
    // 回复类通知（thread_reply / reply_to_reply）的 ref 是 Reply 而非 Thread：
    // Reply 自身 id 是评论 id，root_id 才是所属帖子的 id、root_slug 是帖子 slug，
    // 直接拿 reply 的 id 跳 /post/{id} 会 404。凡带 root_id 的 ref 统一按回复处理
    //（提及等事件 ref 为 post 时也可能是 Reply）。
    const reply = item && 'root_id' in item ? (item as StorydenReply) : undefined;
    // 关注类通知（follow）的 ref 是 ProfileReference，handle 即成员标识
    const profile = kind === 'profile' ? (item as StorydenProfile | undefined) : undefined;
    return {
      id: n.id,
      event: n.event,
      status: n.status === 'read' ? 'read' : 'unread',
      created_at: n.created_at,
      source_handle: n.source?.handle,
      source_name: n.source?.name,
      item_kind: kind,
      item_id: reply?.root_id ?? profile?.handle ?? item?.id,
      item_slug: (item as StorydenNode)?.slug ?? reply?.root_slug ?? (item as StorydenThread)?.slug,
      item_title: (item as StorydenThread)?.title ?? (item as StorydenNode)?.name ?? '',
    };
  });
}

// 标记通知已读: PATCH /api/notifications/{id}
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}`, { status: 'read' });
}
