'use client';

import { LeafDecor } from '@/components/Decor';
import { useT } from '@/hooks/useLang';

export default function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-ink/10 bg-surface/60">
      <div className="mx-auto max-w-4xl px-4 py-8 text-center lg:px-8">
        <p className="hand-title flex items-center justify-center gap-2 text-lg text-ink">
          {t('🌿 WHS 互助社区')}
        </p>
        {/* 页面底部统一免责声明 */}
        <p className="mt-2 text-sm text-ink/60">{t('本论坛仅供 WHS 患者交流，不构成医疗建议')}</p>
        <p className="mt-1 text-xs text-ink/50">
          {t('如遇紧急情况，请及时联系专业医生。请勿在本论坛发布个人敏感信息。')}
        </p>
        <p className="mt-4 text-xs text-ink/40">
          {t('© {year} WHS 互助社区 · 由社区志愿者维护', { year: new Date().getFullYear() })}
        </p>
        <LeafDecor className="mx-auto mt-4 h-8 w-8 text-ink/10" />
      </div>
    </footer>
  );
}
