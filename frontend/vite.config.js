import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, requests to /api are forwarded to the Express backend, so the browser sees one
// origin and no CORS configuration is needed.
const target = process.env.VITE_API_PROXY || 'http://127.0.0.1:5000';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
  preview: { port: 4173, proxy: { '/api': { target, changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/setupTests.js'], css: false },
});
