import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react(), {
    name: 'development-refresh-csp',
    transformIndexHtml(html) {
      // React Refresh injects an inline preamble only in the Vite development server.
      return command === 'serve' ? html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';") : html;
    },
  }],
  server: { port: 5173, strictPort: true },
}));
