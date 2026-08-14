import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
//this is the vitecofig file

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
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req: any, res: any) => {
            const isConnErr =
              ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes(
                err?.code || err?.cause?.code || err?.errors?.[0]?.code
              ) ||
              err?.name === 'AggregateError' ||
              (typeof err?.message === 'string' &&
                ['ECONNREFUSED', 'ECONNRESET'].some((c) => err.message.includes(c)));

            if (isConnErr) {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                res.end('Backend server unavailable');
              }
              return;
            }
            console.error('[vite] http proxy error:', err);
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req: any, res: any) => {
            const isConnErr =
              ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes(
                err?.code || err?.cause?.code || err?.errors?.[0]?.code
              ) ||
              err?.name === 'AggregateError' ||
              (typeof err?.message === 'string' &&
                ['ECONNREFUSED', 'ECONNRESET'].some((c) => err.message.includes(c)));

            if (isConnErr) {
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
              const isConnErr =
                ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes(
                  err?.code || err?.cause?.code || err?.errors?.[0]?.code
                ) ||
                err?.name === 'AggregateError' ||
                (typeof err?.message === 'string' &&
                  ['ECONNREFUSED', 'ECONNRESET'].some((c) => err.message.includes(c)));

              if (isConnErr) return;
            });
          });
        },
      },
    },
  },
});
