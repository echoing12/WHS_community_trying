// ============================================================
//  认证（StoryDen 真实接口：Cookie 会话认证）
// ============================================================
import { api, userFromAccount, type StorydenSession } from './shared';
import type { AuthResponse, LoginInput, RegisterInput, SessionResponse } from '@/types';

// 会话检测: GET /api/session（公开接口，未登录返回 200 且不含 account 字段）
// 返回值语义（调用方必须区分）：
//   - 返回 null → 确定未登录（200 且无 account）
//   - 抛异常   → 网络/后端错误（请求没成功，未知会话状态）
// 区分二者很重要：网络抖动时若把未知状态当「未登录」处理，
// 已登录用户会被误登出（useAuth.refresh 依赖此语义保持登录状态）
export async function fetchSession(): Promise<SessionResponse | null> {
  const { data } = await api.get<StorydenSession>(`/api/session`);
  if (!data?.account) return null;
  // 真实 API 返回字段：account.name / account.handle / account.bio（HTML）/
  // account.joined，对应本站 user 的 name / avatar / bio
  return { user: userFromAccount(data.account) };
}

// 退出登录: POST /api/auth/logout（服务端使会话失效，withCredentials 自动携带 storyden-session）
export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

// 登录: POST /api/auth/password/signin
// StoryDen 认证模式为 handle（handle + password）；浏览器输入的邮箱/昵称作为 identifier 提交，
// 密码作为 token 提交。成功由后端 Set-Cookie 下发 storyden-session，前端不保存 token。
export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<{ id: string }>('/api/auth/password/signin', {
    identifier: input.email,
    token: input.password,
  });
  return { token: data.id, user: { name: input.email, avatar: '' } };
}

// 注册: POST /api/auth/password/signup（handle + password，可选 ?invitation_id= 邀请码）
// 注册成功即建立会话（后端 Set-Cookie），由 AuthForm 调用 refresh() 刷新认证状态
export async function register(input: RegisterInput): Promise<{ success: boolean }> {
  await api.post<{ id: string }>('/api/auth/password/signup', {
    identifier: input.name,
    token: input.password,
  }, {
    // Storyden 规格：invitation_id 是 query 参数（管理员开启邀请制时校验，未开启时传了也会被忽略）
    params: input.invitationId ? { invitation_id: input.invitationId } : {},
  });
  return { success: true };
}
