import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req: any, res: any) => {
            const code = err?.code || (err?.errors && err.errors[0]?.code);
            if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(code) || err?.name === 'AggregateError') {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(504, { 'Content-Type': 'text/plain' });
                res.end('Gateway Timeout');
              }
              return;
            }
            console.error('[vite] ws proxy error:', err);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket: any) => {
            socket.on('error', (err: any) => {
              const code = err?.code || (err?.errors && err.errors[0]?.code);
              if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(code) || err?.name === 'AggregateError') {
                return;
              }
            });
          });
        },
      },
    },
  },
});
