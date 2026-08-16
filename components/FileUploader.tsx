'use client';

import { useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Video } from 'lucide-react';
import { uploadAsset } from '@/lib/api';
import { cn } from '@/lib/utils';

// 文档大小上限：20MB（超限提前拦截，避免长时间上传后失败）
const MAX_DOC_SIZE = 20 * 1024 * 1024;

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

  const isImage = kind === 'image';
  const isVideo = kind === 'video';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    // 文档大小上限提前拦截（图片/视频不限，后端亦无硬性限制）
    if (kind === 'document' && file.size > MAX_DOC_SIZE) {
      setError('文档文件超过 20MB，请压缩后重试');
      return;
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
          ? '图片上传失败，请重试（支持常见图片格式）'
          : isVideo
            ? '视频上传失败，请重试（支持 MP4 / WebM 等常见格式）'
            : '文档上传失败，请重试'
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
            ? '插入图片'
            : isVideo
              ? '上传视频（MP4 / WebM 等浏览器可播放格式）'
              : '上传文档附件（PDF / Word / Excel / TXT，≤20MB）'
        }
        className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-ink/60 px-3 py-1 text-xs font-bold transition-colors hover:bg-butter disabled:opacity-50"
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
        {uploading ? '上传中…' : isImage ? '插图' : isVideo ? '视频' : '文档'}
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
      {error && <span className="text-xs font-bold text-red-500">{error}</span>}
    </span>
  );
}
