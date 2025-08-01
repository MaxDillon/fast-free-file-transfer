import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig(({ command }) => {
  const isProd = command === 'build';

  return {
    base: isProd ? '/fast-free-file-transfer/' : '/',
    plugins: [solid()],
    server: {
      allowedHosts: ['laptop.kinkajou-richter.ts.net'],
    },
  };
});
