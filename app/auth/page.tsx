import { redirect } from 'next/navigation';

// 基于Storyden官方规格: 统一登录入口为 /auth/login（旧链接 /auth 兼容跳转）
export default function AuthPage() {
  redirect('/auth/login');
}
