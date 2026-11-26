import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
// One self-contained index.html (same as the live ERP), so it can be hosted on GitHub Pages as a single file.
import fs from 'fs';
const BUILD = String(Date.now());
export default defineConfig({ define: { __BUILD__: JSON.stringify(BUILD) }, plugins: [react(), viteSingleFile(), { name: 'ver', closeBundle() { fs.mkdirSync('dist', { recursive: true }); fs.writeFileSync('dist/version.txt', BUILD); } }], base: './', build: { chunkSizeWarningLimit: 4000 } });

