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
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, res) {
                        var _a, _b, _c;
                        var isConnErr = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes((err === null || err === void 0 ? void 0 : err.code) || ((_a = err === null || err === void 0 ? void 0 : err.cause) === null || _a === void 0 ? void 0 : _a.code) || ((_c = (_b = err === null || err === void 0 ? void 0 : err.errors) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.code)) ||
                            (err === null || err === void 0 ? void 0 : err.name) === 'AggregateError' ||
                            (typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' &&
                                ['ECONNREFUSED', 'ECONNRESET'].some(function (c) { return err.message.includes(c); }));
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
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, res) {
                        var _a, _b, _c;
                        var isConnErr = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes((err === null || err === void 0 ? void 0 : err.code) || ((_a = err === null || err === void 0 ? void 0 : err.cause) === null || _a === void 0 ? void 0 : _a.code) || ((_c = (_b = err === null || err === void 0 ? void 0 : err.errors) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.code)) ||
                            (err === null || err === void 0 ? void 0 : err.name) === 'AggregateError' ||
                            (typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' &&
                                ['ECONNREFUSED', 'ECONNRESET'].some(function (c) { return err.message.includes(c); }));
                        if (isConnErr) {
                            if (res && !res.headersSent && typeof res.writeHead === 'function') {
                                res.writeHead(504, { 'Content-Type': 'text/plain' });
                                res.end('Gateway Timeout');
                            }
                            return;
                        }
                        console.error('[vite] ws proxy error:', err);
                    });
                    proxy.on('proxyReqWs', function (_proxyReq, _req, socket) {
                        socket.on('error', function (err) {
                            var _a, _b, _c;
                            var isConnErr = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT'].includes((err === null || err === void 0 ? void 0 : err.code) || ((_a = err === null || err === void 0 ? void 0 : err.cause) === null || _a === void 0 ? void 0 : _a.code) || ((_c = (_b = err === null || err === void 0 ? void 0 : err.errors) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.code)) ||
                                (err === null || err === void 0 ? void 0 : err.name) === 'AggregateError' ||
                                (typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' &&
                                    ['ECONNREFUSED', 'ECONNRESET'].some(function (c) { return err.message.includes(c); }));
                            if (isConnErr)
                                return;
                        });
                    });
                },
            },
        },
    },
});
