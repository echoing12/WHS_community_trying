import type { Config } from 'tailwindcss';

const config: Config = {
  // 深色模式：class 切换（<html class="dark">），主题按钮写入 localStorage
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ============ 清新手绘风配色（CSS 变量，深色模式自动切换） ============
      colors: {
        mint: 'rgb(var(--color-mint) / <alpha-value>)', // 页面背景
        ink: 'rgb(var(--color-ink) / <alpha-value>)', // 主色：文字 / 边框
        'ink-solid': 'rgb(var(--color-ink-solid) / <alpha-value>)', // 实心按钮 / 代码块背景
        'on-solid': 'rgb(var(--color-on-solid) / <alpha-value>)', // 实心背景上的文字
        butter: 'rgb(var(--color-butter) / <alpha-value>)', // 点缀：hover 背景 / 高亮
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // 卡片 / 输入框背景
      },
      borderRadius: {
        '2xl': '1.2rem', // 卡片圆角
      },
      // ============ 手绘风扩展 ============
      boxShadow: {
        // 卡片硬阴影：6px 6px 0px 主色 12% 透明
        hand: '6px 6px 0px rgba(45, 90, 74, 0.12)',
        'hand-sm': '4px 4px 0px rgba(45, 90, 74, 0.12)',
      },
      fontFamily: {
        // 正文使用系统无衬线（中英文均友好，无需下载字体）
        // 标题的"手写感"由 .hand-title 类的 font-bold + italic 实现（见 globals.css）
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
