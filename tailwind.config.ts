import type { Config } from 'tailwindcss';

const config: Config = {
  // 深色模式：class 切换（<html class="dark">），主题按钮写入 localStorage
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ============ 克制暖色配色（CSS 变量，深色模式自动切换） ============
      // 用色克制：暖白背景 + 暖炭灰文字 + 单一低饱和深墨绿强调色，
      // 黄色点缀降级为柔和暖沙色，仅用于 hover 背景与轻微高亮。
      colors: {
        mint: 'rgb(var(--color-mint) / <alpha-value>)', // 页面背景（暖白）
        ink: 'rgb(var(--color-ink) / <alpha-value>)', // 主文字 / 边框
        'ink-solid': 'rgb(var(--color-ink-solid) / <alpha-value>)', // 实心按钮 / 强调
        'on-solid': 'rgb(var(--color-on-solid) / <alpha-value>)', // 实心背景上的文字
        butter: 'rgb(var(--color-butter) / <alpha-value>)', // 柔和暖沙色：hover 背景 / 高亮
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // 卡片 / 输入框背景
      },
      borderRadius: {
        '2xl': '1rem', // 卡片圆角（克制：不做夸张大圆角）
      },
      // ============ 透明度补充 ============
      // 默认透明度刻度不含 8% / 15%，补充后 border-ink/15 等修饰符可用
      opacity: {
        8: '0.08',
        15: '0.15',
      },
      // ============ 柔和阴影（软扩散，替代原来的硬阴影） ============
      boxShadow: {
        hand: '0 1px 2px rgba(23, 25, 22, 0.05), 0 12px 28px -12px rgba(23, 25, 22, 0.14)',
        'hand-sm': '0 1px 2px rgba(23, 25, 22, 0.05), 0 4px 10px -4px rgba(23, 25, 22, 0.1)',
      },
      fontFamily: {
        // 正文使用系统无衬线（中英文均友好，无需下载字体）
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans CJK SC',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
