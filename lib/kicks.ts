import { unbanAccount } from './api';

// ============ 成员踢出调度（24 小时临时封禁，到期自动解封） ============
// 背景：Storyden 的封禁接口（POST /admin/bans/{handle}）是永久软删除，
// 没有时长参数，解封只能再调 DELETE /admin/bans/{handle}。
// 因此「踢出一天」由前端调度实现：
//   1. 踢出时把 {handle, 到期时间} 记入 localStorage（scheduleKick）
//   2. 管理员会话存在时定期检查（useAuth 中的轮询），
//      到期记录自动调用解封接口（flushExpiredKicks）
// 说明：解封依赖管理员浏览器在运行（本地站点通常常开）；若到期时无任何
// 页面在跑，解封会顺延到下次管理员打开本站时补执行。管理后台
// /admin/members 的「解封」按钮可随时手动提前解封。

interface KickRecord {
  handle: string;
  name: string;
  kickedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601（到期自动解封）
}

const KICKS_KEY = 'whs_kicks';
const DEFAULT_DURATION_HOURS = 24;

function loadKicks(): KickRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KICKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as KickRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveKicks(records: KickRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KICKS_KEY, JSON.stringify(records));
  } catch {
    // localStorage 不可用（隐私模式等）时忽略 —— 只影响自动解封，封禁本身由后端执行
  }
}

// 记录一次踢出（封禁时调用）；返回到期时间
export function scheduleKick(handle: string, name: string, hours = DEFAULT_DURATION_HOURS): string {
  const now = Date.now();
  const record: KickRecord = {
    handle,
    name,
    kickedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + hours * 3600_000).toISOString(),
  };
  // 同一成员重复踢出 → 覆盖旧记录（以最后一次踢出为准顺延一天）
  saveKicks([...loadKicks().filter((r) => r.handle !== handle), record]);
  return record.expiresAt;
}

// 取消某成员的自动解封记录（手动提前解封时调用，避免重复请求）
export function cancelKick(handle: string) {
  saveKicks(loadKicks().filter((r) => r.handle !== handle));
}

// 当前仍处于踢出期内（未到期）的记录
export function activeKicks(): KickRecord[] {
  const now = Date.now();
  return loadKicks().filter((r) => Date.parse(r.expiresAt) > now);
}

// 到期记录自动解封：逐个调用解封接口，成功（或 404 = 已不在封禁状态）则移除记录；
// 网络等临时错误保留记录，下次轮询重试。返回本次解封成功的数量。
export async function flushExpiredKicks(): Promise<number> {
  const records = loadKicks();
  const now = Date.now();
  const due = records.filter((r) => Date.parse(r.expiresAt) <= now);
  if (due.length === 0) return 0;

  const settled = new Set<string>();
  for (const r of due) {
    try {
      await unbanAccount(r.handle);
      settled.add(r.handle);
    } catch (err) {
      // 404 = 该账号已不在封禁状态（手动解封过 / 账号已注销）→ 视为已处理
      const msg = err instanceof Error ? err.message : '';
      if (/404/.test(msg)) settled.add(r.handle);
    }
  }
  saveKicks(records.filter((r) => !settled.has(r.handle)));
  return settled.size;
}
