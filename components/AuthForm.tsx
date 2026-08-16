'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
  AuthenticationError,
  BadRequestError,
  login,
  PermissionDeniedError,
  RateLimitError,
  register,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';
type Message = { type: 'error' | 'success'; text: string } | null;

// 登录名格式：StoryDen handle 仅支持小写字母 / 数字 / 下划线 / 连字符
const HANDLE_RE = /^[a-z0-9_-]+$/;

// ============ 密码策略（中等强度） ============
// - 长度 8–72 位（72 为 bcrypt 输入上限）
// - 必须同时包含字母和数字（挡住 12345678 / aaaaaaaa 等弱密码）
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

// 返回不符合策略的原因（null = 通过）
function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 位`;
  if (password.length > PASSWORD_MAX) return `密码最长 ${PASSWORD_MAX} 位`;
  if (!/[A-Za-z]/.test(password)) return '密码需包含至少一个字母';
  if (!/\d/.test(password)) return '密码需包含至少一个数字';
  return null;
}

// 强度分档：弱（不达标）/ 中（达标）/ 强（达标且含大写字母或符号）
type Strength = 'weak' | 'medium' | 'strong';
function passwordStrength(password: string): Strength | null {
  if (!password) return null;
  if (passwordPolicyError(password)) return 'weak';
  return /[A-Z]|[^A-Za-z0-9]/.test(password) && password.length >= 12 ? 'strong' : 'medium';
}

const STRENGTH_LABEL: Record<Exclude<Strength, null>, string> = {
  weak: '弱',
  medium: '中',
  strong: '强',
};
const STRENGTH_COLOR: Record<Exclude<Strength, null>, string> = {
  weak: 'text-red-500',
  medium: 'text-amber-500',
  strong: 'text-green-600',
};

// ============ 登录失败退避（配合代理层限流，见 Caddyfile） ============
// 连续失败达到上限后锁定一段时间，阻止脚本化的快速爆破尝试
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

// 把后端返回的认证错误详情（英文）映射为中文提示
function translateAuthError(err: Error): string {
  const m = err.message || '';
  // 邀请码错误必须最先匹配：英文报错常含 invalid，会误落到下面的通用文案
  if (/invitation|invite/i.test(m)) return '邀请码无效或已过期';
  if (/handle|format/i.test(m) && !/password/i.test(m)) {
    return '登录名格式不正确：仅支持小写字母、数字、下划线、连字符';
  }
  if (/too short|too long/i.test(m)) return '密码长度不符合要求（至少 8 位）';
  if (/exists|taken|duplicate/i.test(m)) return '该登录名已被占用，换一个试试';
  if (/invalid|fail|not found|unknown/i.test(m)) return '账号或密码错误，请重试';
  return '操作失败，请重试';
}

// redirect: 登录成功后跳转的页面（来自 /auth/login?redirect=...，见 middleware / AuthGuard / 拦截器）
export default function AuthForm({ redirect }: { redirect?: string | null }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [handle, setHandle] = useState(''); // 登录名（注册） / 登录名或邮箱（登录）
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // 注册：确认密码
  const [invitationId, setInvitationId] = useState(''); // 注册：可选邀请码
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  // 连续失败计数与锁定截止时间；锁定期间禁用提交并倒计时
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 锁定期间每秒刷新倒计时，到期自动解锁并重置计数
  useEffect(() => {
    if (lockUntil === null) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockUntil) {
        setLockUntil(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  const remaining = lockUntil !== null ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
  const locked = remaining > 0;

  // 连续失败累计，达到上限后锁定 LOCK_SECONDS 秒（解锁由上面的 useEffect 驱动）
  const countFailure = () => {
    const next = failedAttempts + 1;
    if (next >= MAX_FAILED_ATTEMPTS) {
      setLockUntil(Date.now() + LOCK_SECONDS * 1000);
      setFailedAttempts(0);
    } else {
      setFailedAttempts(next);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setConfirmPassword('');
    setInvitationId('');
    setFailedAttempts(0);
    setLockUntil(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      setMessage({ type: 'error', text: `尝试次数过多，请 ${remaining} 秒后再试` });
      return;
    }
    const identifier = handle.trim();
    if (!identifier || !password.trim()) {
      setMessage({ type: 'error', text: '请填写所有必填项' });
      return;
    }
    if (mode === 'register') {
      if (!HANDLE_RE.test(identifier)) {
        setMessage({
          type: 'error',
          text: '登录名格式不正确：仅支持小写字母、数字、下划线、连字符（如 xiaoman_mama）',
        });
        return;
      }
      const policyError = passwordPolicyError(password);
      if (policyError) {
        setMessage({ type: 'error', text: policyError });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: '两次输入的密码不一致' });
        return;
      }
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        // 基于Storyden官方规格: 登录成功后刷新认证状态（GET /api/session），
        // 再跳转到 redirect 指定的页面或首页
        await login({ email: identifier, password });
        await refresh();
        setFailedAttempts(0);
        router.push(redirect ?? '/');
      } else {
        // 基于Storyden官方规格: 注册成功即建立会话（后端 Set-Cookie storyden-session），
        // 直接刷新认证状态并进入社区，无需再登录一次
        await register({
          name: identifier,
          email: identifier,
          password,
          ...(invitationId.trim() ? { invitationId: invitationId.trim() } : {}),
        });
        await refresh();
        router.push(redirect ?? '/');
      }
    } catch (err) {
      // 认证接口的 401/404/400/409 由拦截器转为 AuthenticationError / BadRequestError，
      // 这里把具体错误信息内联展示；其余网络错误显示具体原因并给出排查指引
      if (err instanceof AuthenticationError) {
        setMessage({ type: 'error', text: '账号或密码错误，请重试' });
        // 凭证类失败计入退避计数（网络错误 / 限流不计入，避免后端不可达时误锁）
        if (mode === 'login') countFailure();
      } else if (err instanceof BadRequestError) {
        setMessage({ type: 'error', text: translateAuthError(err) });
        if (mode === 'login') countFailure();
      } else if (err instanceof RateLimitError) {
        setMessage({ type: 'error', text: '尝试过于频繁，请稍后再试' });
      } else if (!(err instanceof PermissionDeniedError)) {
        // 网络层错误 / 拦截器未覆盖的状态码：显示具体信息便于排查
        console.error('[AuthForm] 注册/登录失败：', err);
        const detail = err instanceof Error && err.message ? err.message : '';
        // axios 网络错误带 code（ERR_NETWORK / ECONNREFUSED / ETIMEDOUT / ERR_CANCELED…）
        const axiosCode =
          typeof (err as { code?: string }).code === 'string'
            ? (err as { code?: string }).code
            : '';
        setMessage({
          type: 'error',
          text: detail
            ? `请求失败（${axiosCode || '未知'}）：${detail}`
            : `无法连接服务器（${axiosCode || '未知'}）：请确认 Docker Desktop 正在运行、dev server 已重启，然后刷新页面重试`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 注册模式的密码强度实时提示（弱/中/强 + 具体缺失项）
  const strength = passwordStrength(password);
  const strengthColor = strength ? STRENGTH_COLOR[strength] : '';
  const strengthLabel = strength ? STRENGTH_LABEL[strength] : '';
  const passwordPolicyHint = passwordPolicyError(password);
  const confirmMismatch =
    mode === 'register' && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🌿 欢迎来到 WHS 互助社区</CardTitle>
        <CardDescription>这里没有陌生人，只有同路人</CardDescription>
      </CardHeader>

      <CardContent>
        {/* 登录 / 注册切换 */}
        <div className="mb-6 flex overflow-hidden rounded-full border-2 border-dashed border-ink/60">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-bold transition-colors',
              mode === 'login' ? 'bg-ink-solid text-on-solid' : 'hover:bg-butter'
            )}
          >
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-bold transition-colors',
              mode === 'register' ? 'bg-ink-solid text-on-solid' : 'hover:bg-butter'
            )}
          >
            <UserPlus className="h-4 w-4" />
            注册
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* 登录名：注册时要求格式（Storyden handle），登录时也支持邮箱 */}
          <div className="space-y-2">
            <label htmlFor="handle" className="text-sm font-bold">
              {mode === 'register' ? '登录名' : '登录名或邮箱'}
              <span className="text-ink/40"> *</span>
            </label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={mode === 'register' ? '仅小写字母、数字、_ 和 -（如 xiaoman_mama）' : '你的登录名或邮箱'}
              autoComplete="username"
              maxLength={30}
            />
            {mode === 'register' && (
              <p className="text-xs text-ink/50">
                StoryDen 登录名仅支持小写字母、数字、下划线和连字符；注册后登录名不可修改
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-bold">
              密码 <span className="text-ink/40"> *</span>
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? `至少 ${PASSWORD_MIN} 位，需包含字母和数字` : '你的密码'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
            />
            {/* 注册模式：实时密码强度提示 */}
            {mode === 'register' && password && (
              <p className={cn('text-xs font-bold', passwordPolicyHint ? 'text-red-500' : strengthColor)}>
                {passwordPolicyHint ?? `密码强度：${strengthLabel}，请牢记密码`}
              </p>
            )}
          </div>

          {/* 注册模式：确认密码（防止输错，输错会导致账号无法找回） */}
          {mode === 'register' && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-bold">
                确认密码 <span className="text-ink/40"> *</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
              />
              {confirmMismatch && (
                <p className="text-xs font-bold text-red-500">两次输入的密码不一致</p>
              )}
            </div>
          )}

          {/* 注册模式：可选邀请码（Storyden 邀请制；有值才传给后端 ?invitation_id=） */}
          {mode === 'register' && (
            <div className="space-y-2">
              <label htmlFor="invitationId" className="text-sm font-bold">
                邀请码 <span className="text-ink/40">（可选）</span>
              </label>
              <Input
                id="invitationId"
                value={invitationId}
                onChange={(e) => setInvitationId(e.target.value)}
                placeholder="如有邀请码请填写"
                autoComplete="off"
                maxLength={64}
              />
              <p className="text-xs text-ink/50">管理员开启邀请制后，注册必须持有有效邀请码</p>
            </div>
          )}

          {message && (
            <p
              className={cn(
                'text-sm font-bold',
                message.type === 'error' ? 'text-red-500' : 'text-ink'
              )}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading || locked} className="w-full" size="lg">
            {loading
              ? '请稍候…'
              : locked
                ? `请 ${remaining} 秒后再试`
                : mode === 'login'
                  ? '登录'
                  : '注册'}
          </Button>

          {/* 登录提示（真实 StoryDen 账号体系：登录名 + 密码） */}
          <p className="text-center text-xs text-ink/50">
            {mode === 'register'
              ? '注册成功后将自动登录，登录名请牢记'
              : 'StoryDen 社区账号：登录名或邮箱 + 密码'}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
