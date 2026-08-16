import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'WHS 互助社区',
  description: '华氏综合征（Wolf-Hirschhorn Syndrome，4 号染色体短臂缺失）患者与家庭的交流社区',
  // 隐私保护：本论坛仅供患者及家属内部交流，禁止搜索引擎收录
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-mint text-ink">
        {/* 深色模式防闪烁：React 水合前按 localStorage / 系统偏好设置主题 class */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('whs-theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* 基于Storyden官方规格: AuthProvider 挂载于根布局，
            应用启动时自动调用 GET /api/session 检测会话状态，
            Header 与全站写操作按钮共享同一份认证状态 */}
        <AuthProvider>
          <Header />
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:px-8">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
