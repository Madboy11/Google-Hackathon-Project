const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. WebSocket Proxy (ws_proxy.py on 8001)
app.use('/ws', createProxyMiddleware({ 
    target: 'http://127.0.0.1:8001', 
    ws: true,
    changeOrigin: true 
}));

// 2. A2A Orchestrator (orchestrator.py on 8002)
app.use('/orch', createProxyMiddleware({ 
    target: 'http://127.0.0.1:8002', 
    pathRewrite: { '^/orch': '' },
    changeOrigin: true 
}));

// 3. MCP Tool Bridge (mcp_server.py REST on 8003)
app.use('/mcp', createProxyMiddleware({ 
    target: 'http://127.0.0.1:8003', 
    pathRewrite: { '^/mcp': '' },
    changeOrigin: true 
}));

// 4. Core API (main.py on 8000)
app.use('/api', createProxyMiddleware({ 
    target: 'http://127.0.0.1:8000', 
    pathRewrite: { '^/api': '' },
    changeOrigin: true 
}));

// 5. Frontend Dashboard (Vite on 5173)
// Catch-all for UI
app.use('/', createProxyMiddleware({ 
    target: 'http://127.0.0.1:5173', 
    ws: true, // For Vite HMR
    changeOrigin: true 
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==========================================================`);
    console.log(`[API GATEWAY] Listening on http://0.0.0.0:${PORT}`);
    console.log(`Routing traffic to Backend Services & Frontend...`);
    console.log(`==========================================================\n`);
});
