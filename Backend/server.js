'use strict';

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/database');
const { initSocket } = require('./socket');

async function bootstrap() {
  // Connect to MongoDB
  await connectDB();

  // Tạo HTTP server từ Express app
  const server = http.createServer(app);

  // ── Socket.io ──────────────────────────────────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 phút
    },
  });

  initSocket(io);

  // ── Start server ───────────────────────────────────────────────────────────
  server.listen(config.port, () => {
    console.log(`[EZProject] Server running at http://localhost:${config.port}`);
    console.log(`[EZProject] WebSocket ready at ws://localhost:${config.port}`);
    console.log(`[EZProject] Environment: ${config.env}`);
    console.log(`[EZProject] Database: ${config.db.cluster}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('[EZProject] Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap();
