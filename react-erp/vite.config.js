import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
// One self-contained index.html (same as the live ERP), so it can be hosted on GitHub Pages as a single file.
export default defineConfig({ plugins: [react(), viteSingleFile()], base: './', build: { chunkSizeWarningLimit: 4000 } });
