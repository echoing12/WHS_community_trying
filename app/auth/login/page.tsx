import AuthForm from '@/components/AuthForm';

// 基于Storyden官方规格: 登录入口页，支持 ?redirect= 参数（登录成功后跳回原页面）
// 支持 ?mode=register：顶栏「注册」按钮指向这里，直接打开注册表单
export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; mode?: string };
}) {
  // 防开放重定向（生产环境兼容）: 只允许站内相对路径，拒绝 // 与外部协议
  const redirect =
    typeof searchParams.redirect === 'string' &&
    searchParams.redirect.startsWith('/') &&
    !searchParams.redirect.startsWith('//')
      ? searchParams.redirect
      : null;

  // 直接进入注册模式，省去用户再点一次卡片顶部的「注册」开关
  const initialMode = searchParams.mode === 'register' ? 'register' : 'login';

  return (
    <div className="flex justify-center py-4 lg:py-10">
      <AuthForm redirect={redirect} initialMode={initialMode} />
    </div>
  );
}
