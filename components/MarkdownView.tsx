import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 浏览器可内联播放的视频扩展名（识别依据：alt 里的原始文件名，或 src 兜底）
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];

// 判断某资源是否为视频：StoryDen 存储文件名被 slugify 去掉了扩展名（path 无扩展名），
// 所以主信号是 FileUploader 插入时的 alt（原始文件名，始终带扩展名）；src 兜底
// 兼容扩展名未被剥掉的场景。两者都没有扩展名时按非视频处理。
function isVideoAsset(src: string | undefined, alt: string | undefined): boolean {
  const candidates = [alt ?? '', src ?? ''];
  return candidates.some((text) =>
    VIDEO_EXTENSIONS.some((ext) => text.toLowerCase().endsWith(ext))
  );
}

// 附件链接文字 → 下载文件名（去掉 📄 等前导 emoji，仅保留真实文件名）
function linkTextToFilename(children: ReactNode): string {
  const text = Array.isArray(children) ? children.map(String).join('') : String(children ?? '');
  const trimmed = text.trim();
  if (!trimmed) return '';
  // 按码点判断前导 emoji（U+1F000 起，或 U+2600–U+27BF 符号区），避免依赖 u 标志正则
  const first = trimmed.codePointAt(0) ?? 0;
  if (first >= 0x1f000 || (first >= 0x2600 && first <= 0x27bf)) {
    return trimmed.slice(String.fromCodePoint(first).length).trim();
  }
  return trimmed;
}

// Markdown 简版渲染（支持：标题 / 加粗 / 斜体 / 列表 / 引用 / 链接 / 代码 / 表格）
// 样式定义在 app/globals.css 的 .markdown-body 中
export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 视频：FileUploader 上传的视频以 ![](path) 语法插入（alt 为原始文件名，
          // 带扩展名；Storyden 存储文件名被 slugify 去掉了扩展名），识别为视频时
          // 渲染 <video controls> 内嵌播放，否则按普通图片处理。
          img: ({ src, alt }) => {
            if (isVideoAsset(src, alt)) {
              return (
                <video
                  src={src}
                  controls
                  preload="metadata"
                  className="my-3 w-full max-w-2xl rounded-2xl border-2 border-dashed border-ink/30 bg-ink/5"
                />
              );
            }
            return (
              // 图片懒加载 + 宽度约束（手机/窄屏下大图不会撑破布局；与视频卡片样式一致）
              <img
                src={src}
                alt={alt ?? ''}
                loading="lazy"
                decoding="async"
                className="my-3 w-full max-w-2xl rounded-2xl border-2 border-dashed border-ink/30 bg-ink/5"
              />
            );
          },
          // 附件链接：Storyden 存储的附件文件名被 slugify 去掉了扩展名，
          // 对浏览器无法内联渲染的文档（Word / Excel / TXT）加 download 属性，
          // 保证下载文件名带正确扩展名；PDF 保持内联查看（浏览器 PDF 阅读器）。
          a: ({ node: _node, href, children, ...rest }) => {
            if (typeof href === 'string' && href.startsWith('/api/assets/')) {
              const name = linkTextToFilename(children);
              if (name && !name.toLowerCase().endsWith('.pdf')) {
                return (
                  <a href={href} download={name} {...rest}>
                    {children}
                  </a>
                );
              }
            }
            return (
              <a href={href} {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
