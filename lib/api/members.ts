// ============================================================
//  成员（StoryDen 真实资源名：profile）
// ============================================================
// 注意：GET /api/profiles 需要登录（StoryDen 全局安全要求），未登录访问返回 403。
// 本站成员页对访客开放，因此在页面内对 403 做内联提示（skipGlobalHandling 跳过全局弹窗）。
import {
  api,
  profileToMember,
  type ApiRequestConfig,
  type StorydenProfile,
} from './shared';
import type { Member, MembersResponse } from '@/types';

// 成员列表（分页）：GET /api/profiles?page=&page_size=
// StoryDen 不支持按昵称搜索，搜索在客户端完成（与 mock 阶段行为一致）
export async function fetchMembers(
  params: { page?: number; pageSize?: number; search?: string } = {}
): Promise<MembersResponse> {
  const { page = 1, pageSize = 20 } = params;
  const { data } = await api.get<{ profiles: StorydenProfile[]; results?: number }>('/api/profiles', {
    params: { page, page_size: pageSize },
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  const profiles = data.profiles ?? [];
  // 客户端搜索（真实 API 无 search 参数）
  const keyword = (params.search ?? '').trim().toLowerCase();
  const filtered = keyword ? profiles.filter((p) => (p.name ?? '').toLowerCase().includes(keyword)) : profiles;
  return {
    members: filtered.map(profileToMember),
    total: data.results ?? profiles.length,
    page,
    pageSize,
  };
}

// 成员详情: GET /api/profiles/{handle}（公开只读，需登录）
export async function fetchMember(handle: string): Promise<Member> {
  const { data } = await api.get<StorydenProfile>(`/api/profiles/${encodeURIComponent(handle)}`, {
    skipGlobalHandling: true,
  } as ApiRequestConfig);
  return profileToMember(data);
}

// 关注 / 取关: PUT / DELETE /api/profiles/{handle}/followers
export async function toggleFollow(handle: string, following: boolean): Promise<void> {
  if (following) {
    await api.put(`/api/profiles/${encodeURIComponent(handle)}/followers`);
  } else {
    await api.delete(`/api/profiles/${encodeURIComponent(handle)}/followers`);
  }
}

// 粉丝 / 关注列表: GET /api/profiles/{handle}/followers|following
export async function fetchFollowList(
  handle: string,
  type: 'followers' | 'following'
): Promise<Member[]> {
  const { data } = await api.get<{ [key: string]: StorydenProfile[] }>(
    `/api/profiles/${encodeURIComponent(handle)}/${type}`,
    { skipGlobalHandling: true } as ApiRequestConfig
  );
  return (data[type] ?? []).map(profileToMember);
}
