import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LeafDecor, SproutDecor } from '@/components/Decor';
import { AuthProvider } from '@/hooks/useAuth';
import { LangProvider } from '@/hooks/useLang';

export const metadata: Metadata = {
  title: 'WHS 互助社区 · WHS Community',
  description:
    '华氏综合征（Wolf-Hirschhorn Syndrome，4 号染色体短臂缺失）患者与家庭的交流社区 — A community for families affected by Wolf-Hirschhorn Syndrome.',
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
      <body className="relative min-h-screen bg-mint font-sans text-ink antialiased">
        {/* 深色模式防闪烁：React 水合前按 localStorage / 系统偏好设置主题 class */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('whs-theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* 语言防闪烁：水合前设置 <html lang>，避免英文用户先看到中文 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('whs-lang');if(!l)l=(navigator.language||'').toLowerCase().startsWith('en')?'en':'zh';document.documentElement.lang=l==='en'?'en':'zh-CN';}catch(e){}})();`,
          }}
        />
        {/* ============ 全局暖色装饰（只在页面空余处，极浅、不抢内容） ============
            柔和光晕 + 浅淡叶子，固定定位、不响应点击，深色模式下同样生效 */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 right-[-12%] h-[30rem] w-[30rem] rounded-full bg-butter/60 blur-3xl" />
          <div className="absolute bottom-[-24%] left-[-14%] h-[32rem] w-[32rem] rounded-full bg-ink-solid/5 blur-3xl" />
          <LeafDecor className="absolute left-[3%] top-[22%] h-36 w-36 rotate-[-10deg] text-ink/5" />
          <SproutDecor className="absolute bottom-[16%] right-[4%] h-40 w-40 rotate-[8deg] text-ink-solid/10" />
        </div>

        {/* 基于Storyden官方规格: AuthProvider 挂载于根布局，
            应用启动时自动调用 GET /api/session 检测会话状态，
            Header 与全站写操作按钮共享同一份认证状态 */}
        <LangProvider>
          <AuthProvider>
            <div className="relative z-10 flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:px-8">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
