import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { redis } from './presence.js';

const server = createApp();
server.listen(config.port, '0.0.0.0', () => console.log(JSON.stringify({ level:'info', event:'server_started', port: config.port })));
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, async () => {
  server.close(); await redis.quit().catch(()=>undefined); await pool.end().catch(()=>undefined); process.exit(0);
});
