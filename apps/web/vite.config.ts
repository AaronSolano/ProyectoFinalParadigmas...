import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactPath = path.resolve(__dirname, 'node_modules/react').replace(/\\/g, '/');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom').replace(/\\/g, '/');

export default defineConfig({
  plugins: [react() as any],
  envDir: '../../',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: /^react-dom(\/.*)?$/,
        replacement: `${reactDomPath}$1`,
      },
      {
        find: /^react(\/.*)?$/,
        replacement: `${reactPath}$1`,
      },
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    server: {
      deps: {
        inline: [
          '@testing-library/react',
          'react-router',
          'react-router-dom',
          'react-i18next',
          '@tanstack/react-query',
          'react',
          'react-dom',
        ],
      },
    },
  },
});
