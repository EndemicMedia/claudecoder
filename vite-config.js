import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'ClaudeCoder',
      fileName: 'index',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['@actions/core'],
    },
    minify: false,
    sourcemap: true,
  },
});
