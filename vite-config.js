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
      output: {
        format: 'cjs',
        exports: 'auto',
      },
    },
    minify: false,
    sourcemap: true,
    // Ensure the build output is compatible with Node.js
    target: 'node20',
    outDir: 'dist',
  },
  // Prevent Vite from doing HTML-related work
  appType: 'custom',
});
