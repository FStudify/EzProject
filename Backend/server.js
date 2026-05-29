'use strict';

const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/database');

async function bootstrap() {
  // Connect to MongoDB
  await connectDB();

  // Start HTTP server
  const server = app.listen(config.port, () => {
    console.log(`[EZProject] Server running at http://localhost:${config.port}`);
    console.log(`[EZProject] Environment: ${config.env}`);
    console.log(`[EZProject] Database: ${config.db.cluster}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('[EZProject] HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
