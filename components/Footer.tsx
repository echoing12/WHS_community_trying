export default function Footer() {
  return (
    <footer className="border-t-2 border-dashed border-ink/30 bg-surface/50">
      <div className="mx-auto max-w-4xl px-4 py-8 text-center lg:px-8">
        <p className="hand-title text-lg text-ink">🌿 WHS 互助社区</p>
        {/* 页面底部统一免责声明 */}
        <p className="mt-2 text-sm text-ink/70">本论坛仅供 WHS 患者交流，不构成医疗建议</p>
        <p className="mt-1 text-xs text-ink/50">
          如遇紧急情况，请及时联系专业医生。请勿在本论坛发布个人敏感信息。
        </p>
        <p className="mt-4 text-xs text-ink/40">
          © {new Date().getFullYear()} WHS 互助社区 · 由社区志愿者维护
        </p>
      </div>
    </footer>
  );
}
