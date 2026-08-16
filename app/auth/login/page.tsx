import AuthForm from '@/components/AuthForm';

// 基于Storyden官方规格: 登录入口页，支持 ?redirect= 参数（登录成功后跳回原页面）
export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // 防开放重定向（生产环境兼容）: 只允许站内相对路径，拒绝 // 与外部协议
  const redirect =
    typeof searchParams.redirect === 'string' &&
    searchParams.redirect.startsWith('/') &&
    !searchParams.redirect.startsWith('//')
      ? searchParams.redirect
      : null;

  return (
    <div className="flex justify-center py-4 lg:py-10">
      <AuthForm redirect={redirect} />
    </div>
  );
}
