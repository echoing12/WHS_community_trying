// ============================================================
//  lib/markdown.ts 单测（纯函数，node 环境）
//  覆盖：基础语法转换 / 往返一致性 / 纯文本提取 / XSS 防御（协议白名单）
//  运行：npm test
// ============================================================
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, htmlToPlainText, markdownToHtml } from './markdown';

describe('markdownToHtml：基础语法', () => {
  it('标题', () => {
    expect(markdownToHtml('# 标题')).toBe('<body><h1>标题</h1></body>');
  });

  it('粗体 / 斜体 / 行内代码', () => {
    expect(markdownToHtml('**加粗** 和 *斜体* 与 `代码`')).toBe(
      '<body><p><strong>加粗</strong> 和 <em>斜体</em> 与 <code>代码</code></p></body>'
    );
  });

  it('链接与图片', () => {
    const html = markdownToHtml('[官网](https://example.com) ![图](/api/assets/a.png)');
    expect(html).toContain('<a href="https://example.com">官网</a>');
    expect(html).toContain('<img src="/api/assets/a.png" alt="图" />');
  });

  it('围栏代码块（保留语言 class）', () => {
    expect(markdownToHtml('```ts\nconst a = 1\n```')).toBe(
      '<body><pre><code class="language-ts">const a = 1</code></pre></body>'
    );
  });

  it('列表 / 引用 / 表格 / 分隔线', () => {
    const html = markdownToHtml('- a\n- b\n\n> 引用\n\n---');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<blockquote><p>引用</p></blockquote>');
    expect(html).toContain('<hr />');
  });

  it('尖括号 URL 写法 [x](<url>)', () => {
    expect(markdownToHtml('[链接](<https://example.com/a b>)')).toContain(
      '<a href="https://example.com/a b">链接</a>'
    );
  });
});

describe('markdownToHtml：XSS 防御（协议白名单）', () => {
  it('javascript: 链接降级为纯文本，不生成 <a>', () => {
    const html = markdownToHtml('[点击](javascript:alert(1))');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('alert');
    expect(html).toContain('点击');
  });

  it('data: 图片被丢弃，只保留 alt 文本', () => {
    const html = markdownToHtml('![bad](data:image/svg+xml;base64,PHN2Zz4=)');
    expect(html).not.toContain('<img');
    expect(html).toContain('bad');
  });

  it('vbscript: / file: 协议同样被拒绝', () => {
    expect(markdownToHtml('[a](vbscript:msgbox(1))')).not.toContain('<a');
    expect(markdownToHtml('[b](file:///etc/passwd)')).not.toContain('<a');
  });

  it('https / mailto / 相对路径 / 裸文本允许', () => {
    expect(markdownToHtml('[a](https://x.com)')).toContain('<a href="https://x.com">');
    expect(markdownToHtml('[a](mailto:hi@x.com)')).toContain('<a href="mailto:hi@x.com">');
    expect(markdownToHtml('[a](/api/assets/foo)')).toContain('<a href="/api/assets/foo">');
    expect(markdownToHtml('[a](example.com/path)')).toContain('<a href="example.com/path">');
  });

  it('标签注入与属性注入被转义', () => {
    const html = markdownToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');

    // 链接文本里带引号试图逃逸出 href 属性：
    // 引号会被转义成 &quot;，不能形成真实的 onmouseover=" 属性
    const inject = markdownToHtml('[x" onmouseover="alert(1)](https://a.com)');
    expect(inject).not.toMatch(/onmouseover="alert/);
    expect(inject).toContain('&quot;');
  });
});

describe('往返一致性：markdownToHtml → htmlToMarkdown', () => {
  it('正文结构保持（标题 / 段落 / 代码 / 链接）', () => {
    const md = '# 标题\n\n正文内容，带 **粗体** 和 [链接](https://example.com)。\n\n```js\ncode\n```';
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
  });

  it('列表与表格往返', () => {
    const md = '- 一\n- 二\n\n| a | b |\n| --- | --- |\n| 1 | 2 |';
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
  });

  it('引用块往返', () => {
    const md = '> 引用一行';
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
  });
});

describe('htmlToPlainText', () => {
  it('提取可读文本并保留换行', () => {
    expect(htmlToPlainText('<body><p>第一行</p><p>第二行</p></body>')).toBe('第一行\n第二行');
  });

  it('图片返回 alt 文本', () => {
    expect(htmlToPlainText('<p>看 <img src="/x.png" alt="示意图" /></p>')).toBe('看 示意图');
  });

  it('空值安全', () => {
    expect(htmlToPlainText(null)).toBe('');
    expect(htmlToPlainText(undefined)).toBe('');
  });
});
