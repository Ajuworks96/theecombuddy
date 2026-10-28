const path = require('path');
const fs = require('fs');
const net = require('net');
const { RedisMemoryServer } = require('redis-memory-server');

const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const PID_FILE = path.resolve(__dirname, '../data/local-redis.pid');
const DATA_DIR = path.resolve(__dirname, '../data');

let serverInstance = null;

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function start() {
  console.log(`[local-redis] Starting Redis development server on port ${REDIS_PORT}...`);
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const alreadyRunning = await isPortInUse(REDIS_PORT);
  if (alreadyRunning) {
    console.log(`[local-redis] Redis server is already active and listening on port ${REDIS_PORT}.`);
    if (!fs.existsSync(PID_FILE)) {
      fs.writeFileSync(PID_FILE, JSON.stringify({ port: REDIS_PORT, startedAt: new Date().toISOString() }));
    }
    return;
  }

  try {
    serverInstance = new RedisMemoryServer({
      instance: {
        port: REDIS_PORT,
        ip: '127.0.0.1',
      },
      autoStart: false,
    });

    await serverInstance.start();
    const host = await serverInstance.getHost();
    const port = await serverInstance.getPort();

    fs.writeFileSync(PID_FILE, JSON.stringify({
      port,
      host,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }));

    console.log(`[local-redis] Redis is listening on redis://${host}:${port}`);

    // Keep process alive if invoked directly as a daemon
    const keepAlive = () => {
      setTimeout(keepAlive, 1000 * 60 * 60);
    };
    keepAlive();

    const cleanup = async () => {
      console.log('[local-redis] Shutting down Redis server...');
      if (serverInstance) {
        await serverInstance.stop();
      }
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('[local-redis] Failed to start Redis server:', err.message);
    process.exit(1);
  }
}

async function stop() {
  console.log('[local-redis] Stopping Redis server...');
  if (fs.existsSync(PID_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
      if (data.pid && data.pid !== process.pid) {
        try {
          process.kill(data.pid, 'SIGTERM');
        } catch (_) {}
      }
      fs.unlinkSync(PID_FILE);
    } catch (_) {}
  }
  console.log('[local-redis] Redis stop command issued.');
}

async function status() {
  const inUse = await isPortInUse(REDIS_PORT);
  const pidExists = fs.existsSync(PID_FILE);
  console.log(`[local-redis] Redis status: ${inUse ? 'RUNNING' : 'STOPPED'} (Port: ${REDIS_PORT}, PID file: ${pidExists ? 'YES' : 'NO'})`);
}

const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'status':
    status();
    break;
  default:
    console.log('Usage: node deploy/scripts/local-redis.js [start|stop|status]');
    process.exit(1);
}

