'use client';

import { useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Video } from 'lucide-react';
import { uploadAsset } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { cn } from '@/lib/utils';

// 前端上传限制（后端按魔数识别 MIME 无硬性限制，这里提前拦截避免无效的长耗时上传）
const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024, // 图片 ≤10MB
  document: 20 * 1024 * 1024, // 文档 ≤20MB（原有限制）
  video: 200 * 1024 * 1024, // 视频 ≤200MB
};
const SIZE_LIMIT_LABELS: Record<string, string> = { image: '10MB', document: '20MB', video: '200MB' };

// 文档扩展名白名单（accept 属性可被绕过，这里做兜底校验）
const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];

// 正文附件按钮：上传图片 / 文档 / 视频到 StoryDen assets
// （POST /api/assets，按魔数识别 MIME，无白名单），成功后把 markdown 语法传给 onInsert
// （由表单追加到正文末尾）。
// 图片插入 ![](path)；视频与图片同样用 ![](path) 语法，但 alt 必须是原始文件名
// （StoryDen 会 slugify 存储文件名并去掉扩展名，path 不含扩展名），
// MarkdownView 据此 alt 识别视频并渲染 <video controls>；
// 文档（PDF / Word / Excel / TXT）插入 [📄 文件名](<path>) 链接，
// 链接文字就是文件名，MarkdownView 据此为浏览器无法内联渲染的格式补 download 属性。
export default function FileUploader({
  kind,
  onInsert,
  className,
}: {
  kind: 'image' | 'document' | 'video';
  onInsert: (markdown: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const t = useT();

  const isImage = kind === 'image';
  const isVideo = kind === 'video';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    // 大小上限提前拦截（按类型区分，避免长时间上传后失败）
    if (file.size > SIZE_LIMITS[kind]) {
      setError(t('文件超过 {size}，请压缩后重试', { size: SIZE_LIMIT_LABELS[kind] }));
      return;
    }
    // 类型校验（accept 属性可被绕过，这里按 MIME / 扩展名兜底）
    if (kind === 'image' && !file.type.startsWith('image/')) {
      setError(t('请选择图片文件（JPG / PNG / GIF 等）'));
      return;
    }
    if (kind === 'video' && !file.type.startsWith('video/')) {
      setError(t('请选择视频文件（MP4 / WebM 等浏览器可播放格式）'));
      return;
    }
    if (kind === 'document') {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const typeOk =
        DOC_EXTENSIONS.includes(ext) ||
        file.type === 'application/pdf' ||
        file.type === 'text/plain' ||
        file.type.startsWith('application/vnd');
      if (!typeOk) {
        setError(t('仅支持 PDF / Word / Excel / TXT 文档'));
        return;
      }
    }
    setUploading(true);
    setError('');
    try {
      const { path } = await uploadAsset(file);
      // 插入 markdown。注意不要用 [x](<url>) 尖括号写法：
      // 本站手写的 markdown→HTML 转换器（lib/markdown.ts）不支持该语法，
      // 会把 < > 转义进 href 导致链接 404。slug 化的附件路径不含空格/括号，裸写即可。
      // 图片 / 视频都走 ![](path)，alt 用原始文件名（视频的识别依据，必须保留扩展名）。
      onInsert(
        kind === 'document'
          ? `\n[📄 ${file.name}](${path})\n`
          : `\n![${file.name}](${path})\n`
      );
    } catch {
      setError(
        isImage
          ? t('图片上传失败，请重试（支持常见图片格式）')
          : isVideo
            ? t('视频上传失败，请重试（支持 MP4 / WebM 等常见格式）')
            : t('文档上传失败，请重试')
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={
          isImage
            ? t('插入图片')
            : isVideo
              ? t('上传视频（MP4 / WebM 等浏览器可播放格式）')
              : t('上传文档附件（PDF / Word / Excel / TXT，≤20MB）')
        }
        className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-3 py-1 text-xs font-medium transition-colors hover:border-ink/30 hover:bg-ink/5 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isImage ? (
          <ImagePlus className="h-3.5 w-3.5" />
        ) : isVideo ? (
          <Video className="h-3.5 w-3.5" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        {uploading ? t('上传中…') : isImage ? t('插图') : isVideo ? t('视频') : t('文档')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={
          isImage
            ? 'image/*'
            : isVideo
              ? 'video/*'
              : 'application/pdf,.doc,.docx,.xls,.xlsx,.txt'
        }
        className="hidden"
        onChange={handleFile}
      />
      {error && <span className="text-xs font-medium text-red-500">{error}</span>}
    </span>
  );
}
