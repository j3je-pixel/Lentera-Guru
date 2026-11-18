import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: 'copy-gas-index-html',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const builtHtml = path.resolve(__dirname, 'dist-gas/index.html');
        const gasDir = path.resolve(__dirname, 'public/gas');
        const targetHtml = path.join(gasDir, 'Index.html');
        if (fs.existsSync(builtHtml)) {
          fs.mkdirSync(gasDir, { recursive: true });
          fs.copyFileSync(builtHtml, targetHtml);
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-gas',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 10000,
  },
});
