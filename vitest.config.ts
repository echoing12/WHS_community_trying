import { defineConfig } from 'vitest/config';

// vitest 配置：本站的 lib/ 转换器是纯函数（无 DOM 依赖），node 环境即可跑
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
