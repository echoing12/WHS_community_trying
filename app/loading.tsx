// 路由级加载骨架：页面切换时的统一占位（App Router 自动包裹）
// 克制风格骨架：淡色圆角条 + pulse 动画，替代原来的「加载中…」文字
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="hand-card animate-pulse space-y-4 p-8">
        <div className="h-7 w-2/3 rounded-md bg-ink/10" />
        <div className="h-4 w-full rounded-md bg-ink/10" />
        <div className="h-4 w-1/2 rounded-md bg-ink/10" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="hand-card animate-pulse space-y-3 p-6">
            <div className="h-5 w-1/3 rounded-md bg-ink/10" />
            <div className="h-4 w-full rounded-md bg-ink/10" />
            <div className="h-4 w-4/5 rounded-md bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
