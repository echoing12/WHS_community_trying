// ============================================================
//  Markdown ↔ HTML 转换（适配 StoryDen 真实 API）
// ============================================================
// StoryDen 的帖子 / 知识库正文是富文本 HTML（block 结构，服务端会为
// <p>/<h2> 等块级元素分配 sdb_ 前缀的块 id，并对内容做 sanitize）。
// 本前端编辑区仍是 Markdown 简版，因此：
//   - 发布时 markdownToHtml()：把 Markdown 转成 HTML 再提交，
//     服务端才能正确解析块结构（直接提交 Markdown 会被当成纯文本转义）
//   - 展示时 htmlToMarkdown()：把服务端返回的 HTML 还原为 Markdown，
//     交给现有 MarkdownView（react-markdown）渲染，UI 完全不变
//   - 评论等纯文本场景用 htmlToPlainText()：提取可读文本（保留换行）
// ============================================================

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPE_MAP[c]);
}

const UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function unescapeHtml(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => UNESCAPE_MAP[m]);
}

// ============ Markdown → HTML ============

// 兼容 CommonMark 的尖括号 URL 写法 [x](<url>)：剥掉首尾 < >（内部允许空格）
function stripUrlBrackets(url: string): string {
  if (url.startsWith('<') && url.endsWith('>')) return url.slice(1, -1);
  return url;
}

// 内联语法：`code`、![alt](url)、[text](url)、**bold**、*italic*
// 实现要点：生成的 HTML 标签先用占位符保护，最后对剩余纯文本统一转义，
// 再还原占位符 —— 避免转义把生成好的标签也转掉
function renderInline(text: string): string {
  // 1. 先保护行内代码（内部不做任何解析）
  const codeSpans: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code);
    return `@@CODE${codeSpans.length - 1}@@`;
  });

  // 2. 生成的标签占位符（escapeHtml 后还原）
  const tags: string[] = [];
  const protect = (s: string) => {
    tags.push(s);
    return `@@TAG${tags.length - 1}@@`;
  };

  // 3. 图片 ![...](...)（URL 兼容 <url> 尖括号写法，剥掉括号再转义）
  text = text.replace(/!\[([^\]]*)\]\(((?:<[^>]*>|[^)\s]+))(?:\s+"[^"]*")?\)/g, (_m, alt: string, src: string) => {
    return protect(`<img src="${escapeHtml(stripUrlBrackets(src))}" alt="${escapeHtml(alt)}" />`);
  });

  // 4. 链接 [text](url)（text 部分递归渲染加粗/斜体；URL 兼容 <url> 尖括号写法）
  text = text.replace(/\[([^\]]+)\]\(((?:<[^>]*>|[^)\s]+))(?:\s+"[^"]*")?\)/g, (_m, label: string, href: string) => {
    return protect(`<a href="${escapeHtml(stripUrlBrackets(href))}">${renderInline(label)}</a>`);
  });

  // 5. 加粗 / 斜体（只匹配成对出现的）
  text = text.replace(/\*\*([^*]+)\*\*/g, (_m, inner: string) => protect(`<strong>${renderInline(inner)}</strong>`));
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, (_m, pre: string, inner: string) => `${pre}${protect(`<em>${renderInline(inner)}</em>`)}`);

  // 6. 还原行内代码（内容已转义）
  text = text.replace(/@@CODE(\d+)@@/g, (_m, i: string) => protect(`<code>${escapeHtml(codeSpans[Number(i)])}</code>`));

  // 7. 对剩余纯文本统一转义，再还原标签占位符
  return escapeHtml(text).replace(/@@TAG(\d+)@@/g, (_m, i: string) => tags[Number(i)]);
}

// 支持的最小 Markdown 子集 → HTML 块
export function markdownToHtml(markdown: string): string {
  const source = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = source.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html: string[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');

    // 围栏代码块 ```lang ... ```
    const fence = block.match(/^```([\w+-]*)\n([\s\S]*?)\n```$/);
    if (fence) {
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      html.push(`<pre><code${lang}>${escapeHtml(fence[2])}</code></pre>`);
      continue;
    }

    // 标题 # ~ ######
    const heading = block.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // 水平分割线 ---
    if (/^(-{3,}|\*{3,})$/.test(block)) {
      html.push('<hr />');
      continue;
    }

    // 引用 >（支持多行）
    if (lines.every((l) => /^\s*>/.test(l))) {
      const inner = lines
        .map((l) => l.replace(/^\s*>\s?/, '').trim())
        .filter(Boolean)
        .map((l) => renderInline(l))
        .join('<br />');
      html.push(`<blockquote><p>${inner}</p></blockquote>`);
      continue;
    }

    // 无序列表
    if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*[-*+]\s+/, '').trim())}</li>`).join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    // 有序列表
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, '').trim())}</li>`).join('');
      html.push(`<ol>${items}</ol>`);
      continue;
    }

    // GFM 表格 | a | b |（含分隔行）
    if (lines.length >= 2 && /^\s*\|/.test(lines[0]) && /^\s*\|[\s:|-]+\|?$/.test(lines[1])) {
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const headers = cells(lines[0]);
      const rows = lines.slice(2).filter((l) => /^\s*\|/.test(l)).map(cells);
      html.push(
        '<table><thead><tr>' +
          headers.map((h) => `<th>${renderInline(h)}</th>`).join('') +
          '</tr></thead><tbody>' +
          rows
            .map((r) => '<tr>' + r.map((c) => `<td>${renderInline(c)}</td>`).join('') + '</tr>')
            .join('') +
          '</tbody></table>'
      );
      continue;
    }

    // 普通段落
    html.push(`<p>${lines.map((l) => renderInline(l.trim())).join('<br />')}</p>`);
  }

  return `<body>${html.join('')}</body>`;
}

// ============ HTML → Markdown / 纯文本 ============

interface HtmlNode {
  name: string; // 标签名；'#text' 表示文本节点
  attrs: Record<string, string>;
  children: HtmlNode[];
  text?: string; // 文本节点内容（name === '#text' 时有效）
}

// 简易 HTML 解析（只覆盖 StoryDen sanitize 后的块结构子集）
function parseHtml(html: string): HtmlNode[] {
  const stack: HtmlNode[] = [];
  const roots: HtmlNode[] = [];
  let text = '';
  const flushText = () => {
    if (text) {
      const node: HtmlNode = { name: '#text', attrs: {}, children: [], text: unescapeHtml(text) };
      if (stack.length) stack[stack.length - 1].children.push(node);
      else roots.push(node);
      text = '';
    }
  };
  const attrRe = /([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g;

  for (let i = 0; i < html.length; ) {
    if (html[i] === '<') {
      const close = html.indexOf('>', i);
      if (close === -1) break;
      const raw = html.slice(i + 1, close).trim();
      i = close + 1;
      if (!raw) continue;
      if (raw.startsWith('!--')) continue; // 注释
      if (raw.startsWith('/')) {
        // 闭合标签：弹栈并把闭合节点挂回父节点
        const name = raw.slice(1).split(/\s/)[0].toLowerCase();
        flushText();
        if (stack.length && stack[stack.length - 1].name === name) {
          const node = stack.pop()!;
          if (stack.length) stack[stack.length - 1].children.push(node);
          else roots.push(node);
        } else {
          // 未匹配（如标签顺序异常）：在栈内向前查找同名节点，宽容收尾
          const idx = stack.map((n) => n.name).lastIndexOf(name);
          if (idx >= 0) {
            const rest = stack.splice(idx);
            const node = rest[0];
            for (let k = 1; k < rest.length; k++) node.children.push(rest[k]);
            if (stack.length) stack[stack.length - 1].children.push(node);
            else roots.push(node);
          }
        }
      } else {
        // 开标签
        const selfClose = /\/$/.test(raw);
        const name = raw.split(/\s/)[0].toLowerCase();
        const attrs: Record<string, string> = {};
        attrRe.lastIndex = 0;
        const firstSpace = raw.indexOf(' ');
        const attrPart = firstSpace >= 0 ? raw.slice(firstSpace + 1).replace(/\/$/, '') : '';
        let m: RegExpExecArray | null;
        while ((m = attrRe.exec(attrPart))) {
          // 属性值同样需要反转义（如 href="&lt;/api/...&gt;" 或 URL 里的 &amp;）
          attrs[m[1].toLowerCase()] = unescapeHtml(m[2] ?? m[3] ?? '');
        }
        const node: HtmlNode = { name, attrs, children: [] };
        if (selfClose || name === 'br' || name === 'hr' || name === 'img') {
          flushText();
          if (stack.length) stack[stack.length - 1].children.push(node);
          else roots.push(node);
        } else {
          flushText();
          stack.push(node);
        }
      }
    } else {
      text += html[i];
      i++;
    }
  }
  flushText();
  // 收尾：栈里剩余未闭合节点直接作为根节点
  while (stack.length) roots.push(stack.pop()!);
  return roots;
}

// 块级标签：换行分隔
function nodeToMarkdown(node: HtmlNode, depth = 0): string {
  switch (node.name) {
    case '#text':
      return node.text ?? '';
    case 'br':
      return '\n';
    case 'hr':
      return '\n\n---\n\n';
    case 'p':
    case 'div': {
      const inner = node.children.map((c) => nodeToMarkdown(c, depth)).join('');
      return `\n\n${inner}\n\n`;
    }
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const level = Number(node.name[1]);
      return `\n\n${'#'.repeat(level)} ${node.children.map((c) => nodeToMarkdown(c, depth)).join('')}\n\n`;
    }
    case 'strong': case 'b':
      return `**${node.children.map((c) => nodeToMarkdown(c, depth)).join('')}**`;
    case 'em': case 'i':
      return `*${node.children.map((c) => nodeToMarkdown(c, depth)).join('')}*`;
    case 'code':
      return `\`${node.children.map((c) => nodeToMarkdown(c, depth)).join('').replace(/`/g, '\\`')}\``;
    case 'pre': {
      // 代码块内容按纯文本提取（避免内部的 code 节点再套一层反引号）
      const walkText = (n: HtmlNode): string =>
        n.name === '#text' ? (n.text ?? '') : n.children.map(walkText).join('');
      const code = node.children.map(walkText).join('').trim();
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case 'a':
      return `[${node.children.map((c) => nodeToMarkdown(c, depth)).join('')}](${node.attrs.href ?? ''})`;
    case 'img':
      return `![${node.attrs.alt ?? ''}](${node.attrs.src ?? ''})`;
    case 'blockquote': {
      const inner = node.children.map((c) => nodeToMarkdown(c, depth + 1)).join('').trim();
      return `\n\n${inner.split('\n').map((l) => `> ${l}`).join('\n')}\n\n`;
    }
    case 'ul': case 'ol': {
      const ordered = node.name === 'ol';
      let counter = 1;
      return `\n\n${node.children
        .filter((c) => c.name === 'li' || (c.name === '#text' && (c.text ?? '').trim()))
        .map((li) => {
          const marker = ordered ? `${counter++}. ` : '- ';
          const text = nodeToMarkdown(li, depth + 1).trim();
          const indent = '  '.repeat(depth);
          // 嵌套列表的子行缩进
          const subLists = li.children.filter((c) => c.name === 'ul' || c.name === 'ol');
          let result = `${indent}${marker}${text.replace(/\n{2,}/g, '\n')}`;
          for (const sub of subLists) result += `\n${nodeToMarkdown(sub, depth + 1).trim()}`;
          return result;
        })
        .join('\n')}\n\n`;
    }
    case 'table': {
      const rows = node.children
        .filter((c) => c.name === 'tr')
        .map((tr) =>
          tr.children
            .filter((c) => c.name === 'th' || c.name === 'td')
            .map((c) => nodeToMarkdown(c, depth).trim().replace(/\n+/g, ' '))
        );
      if (!rows.length) return '';
      const header = rows[0];
      const body = rows.slice(1);
      const rowStr = (cells: string[]) => `| ${cells.join(' | ')} |`;
      const sep = `| ${header.map(() => '---').join(' | ')} |`;
      return `\n\n${rowStr(header)}\n${sep}\n${body.map(rowStr).join('\n')}\n\n`;
    }
    case 'tr': case 'td': case 'th': case 'li':
      // 由父节点处理
      return node.children.map((c) => nodeToMarkdown(c, depth)).join('');
    default:
      // 未知标签：仅保留内部文本
      return node.children.map((c) => nodeToMarkdown(c, depth)).join('');
  }
}

// StoryDen HTML 正文 → Markdown（供 MarkdownView 渲染）
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return '';
  const nodes = parseHtml(html);
  return nodes.map((n) => nodeToMarkdown(n)).join('').replace(/\n{3,}/g, '\n\n').trim();
}

// StoryDen HTML → 可读纯文本（评论 / 简介展示，保留换行）
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const nodes = parseHtml(html);
  const walk = (node: HtmlNode): string => {
    switch (node.name) {
      case '#text':
        return node.text ?? '';
      case 'br':
        return '\n';
      case 'p': case 'div': case 'blockquote': case 'li':
        return `${node.children.map(walk).join('')}\n`;
      case 'tr':
        return `${node.children.map(walk).join('')}\n`;
      case 'td': case 'th':
        return `${node.children.map(walk).join('')} `;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `${node.children.map(walk).join('')}\n`;
      case 'pre':
        return `${node.children.map(walk).join('')}\n`;
      case 'a':
        return node.children.map(walk).join('');
      case 'img':
        return node.attrs.alt ?? '';
      default:
        return node.children.map(walk).join('');
    }
  };
  return nodes.map(walk).join('').replace(/\n{3,}/g, '\n\n').trim();
}
