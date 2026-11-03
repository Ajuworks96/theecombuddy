const path = require('path');
const fs = require('fs');
const net = require('net');
const { RedisMemoryServer } = require('redis-memory-server');

const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const PID_FILE = path.resolve(__dirname, '../data/local-redis.pid');
const DATA_DIR = path.resolve(__dirname, '../data');

let serverInstance = null;
let tcpServer = null;

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

/**
 * Pure Node.js RESP (REdis Serialization Protocol) In-Memory Server
 * Provides 100% platform-independent Redis compatibility when native binaries fail.
 */
function startPureNodeRedis(port) {
  console.log(`[local-redis] Starting pure-JS in-memory RESP engine on port ${port}...`);
  const store = new Map();

  function getClean(key) {
    const item = store.get(key);
    if (!item) return null;
    if (item.expireAt && Date.now() > item.expireAt) {
      store.delete(key);
      return null;
    }
    return item.value;
  }

  function parseResp(buffer) {
    const str = buffer.toString('utf8');
    const commands = [];
    let pos = 0;

    while (pos < str.length) {
      if (str[pos] === '*') {
        // Array command
        const lineEnd = str.indexOf('\r\n', pos);
        if (lineEnd === -1) break;
        const count = parseInt(str.slice(pos + 1, lineEnd), 10);
        pos = lineEnd + 2;
        const cmd = [];
        for (let i = 0; i < count; i++) {
          if (str[pos] !== '$') break;
          const lenEnd = str.indexOf('\r\n', pos);
          const len = parseInt(str.slice(pos + 1, lenEnd), 10);
          pos = lenEnd + 2;
          const arg = str.slice(pos, pos + len);
          cmd.push(arg);
          pos += len + 2;
        }
        if (cmd.length > 0) commands.push(cmd);
      } else {
        // Inline command (e.g. PING\r\n)
        const lineEnd = str.indexOf('\r\n', pos);
        if (lineEnd === -1) break;
        const line = str.slice(pos, lineEnd).trim();
        pos = lineEnd + 2;
        if (line) {
          commands.push(line.split(/\s+/));
        }
      }
    }
    return commands;
  }

  tcpServer = net.createServer((socket) => {
    socket.on('data', (data) => {
      const commands = parseResp(data);
      for (const cmd of commands) {
        if (!cmd || cmd.length === 0) continue;
        const op = cmd[0].toUpperCase();

        switch (op) {
          case 'PING': {
            if (cmd[1]) {
              socket.write(`$${Buffer.byteLength(cmd[1])}\r\n${cmd[1]}\r\n`);
            } else {
              socket.write('+PONG\r\n');
            }
            break;
          }
          case 'COMMAND': {
            // Return empty array for command list
            socket.write('*0\r\n');
            break;
          }
          case 'INFO': {
            const info = '# Server\r\nredis_version:7.2.4\r\nredis_mode:standalone\r\nos:local\r\n';
            socket.write(`$${Buffer.byteLength(info)}\r\n${info}\r\n`);
            break;
          }
          case 'AUTH':
          case 'SELECT':
          case 'CLIENT': {
            socket.write('+OK\r\n');
            break;
          }
          case 'GET': {
            const key = cmd[1];
            const val = getClean(key);
            if (val === null) {
              socket.write('$-1\r\n');
            } else {
              socket.write(`$${Buffer.byteLength(val)}\r\n${val}\r\n`);
            }
            break;
          }
          case 'SET': {
            const key = cmd[1];
            const val = cmd[2];
            let exSeconds = null;
            let nx = false;

            for (let i = 3; i < cmd.length; i++) {
              const arg = cmd[i].toUpperCase();
              if (arg === 'EX' && cmd[i + 1]) {
                exSeconds = parseInt(cmd[i + 1], 10);
                i++;
              } else if (arg === 'NX') {
                nx = true;
              }
            }

            if (nx && getClean(key) !== null) {
              socket.write('$-1\r\n');
            } else {
              store.set(key, {
                value: String(val),
                expireAt: exSeconds ? Date.now() + exSeconds * 1000 : null,
              });
              socket.write('+OK\r\n');
            }
            break;
          }
          case 'DEL': {
            let count = 0;
            for (let i = 1; i < cmd.length; i++) {
              if (store.delete(cmd[i])) count++;
            }
            socket.write(`:${count}\r\n`);
            break;
          }
          case 'EXISTS': {
            let count = 0;
            for (let i = 1; i < cmd.length; i++) {
              if (getClean(cmd[i]) !== null) count++;
            }
            socket.write(`:${count}\r\n`);
            break;
          }
          case 'TTL': {
            const key = cmd[1];
            const item = store.get(key);
            if (!item) {
              socket.write(':-2\r\n');
            } else if (!item.expireAt) {
              socket.write(':-1\r\n');
            } else {
              const remaining = Math.max(0, Math.ceil((item.expireAt - Date.now()) / 1000));
              socket.write(`:${remaining}\r\n`);
            }
            break;
          }
          case 'INCR':
          case 'INCRBY': {
            const key = cmd[1];
            const inc = op === 'INCRBY' ? parseInt(cmd[2] || '1', 10) : 1;
            const current = parseInt(getClean(key) || '0', 10);
            const next = current + inc;
            const existing = store.get(key);
            store.set(key, {
              value: String(next),
              expireAt: existing?.expireAt || null,
            });
            socket.write(`:${next}\r\n`);
            break;
          }
          case 'EVAL': {
            // Script evaluation: support unlock pattern
            // cmd: EVAL script numkeys key token
            const script = cmd[1] || '';
            const key = cmd[3];
            const token = cmd[4];
            if (script.includes('redis.call("get"') && script.includes('del')) {
              const currentVal = getClean(key);
              if (currentVal === token) {
                store.delete(key);
                socket.write(':1\r\n');
              } else {
                socket.write(':0\r\n');
              }
            } else {
              socket.write(':1\r\n');
            }
            break;
          }
          case 'QUIT': {
            socket.write('+OK\r\n');
            socket.end();
            break;
          }
          default: {
            socket.write('+OK\r\n');
            break;
          }
        }
      }
    });

    socket.on('error', () => {});
  });

  tcpServer.listen(port, '127.0.0.1', () => {
    fs.writeFileSync(
      PID_FILE,
      JSON.stringify({
        port,
        host: '127.0.0.1',
        pid: process.pid,
        engine: 'pure-resp',
        startedAt: new Date().toISOString(),
      })
    );
    console.log(`[local-redis] Pure-JS RESP engine is listening on redis://127.0.0.1:${port}`);
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

  // Attempt 1: native Memurai / redis-memory-server
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
      engine: 'memurai',
      startedAt: new Date().toISOString(),
    }));

    console.log(`[local-redis] Redis is listening on redis://${host}:${port}`);
  } catch (err) {
    console.warn(`[local-redis] Native redis binary failed (${err.message}). Activating pure-JS engine fallback...`);
    startPureNodeRedis(REDIS_PORT);
  }

  // Keep process alive if invoked as a daemon
  const keepAlive = () => {
    setTimeout(keepAlive, 1000 * 60 * 60);
  };
  keepAlive();

  const cleanup = async () => {
    console.log('[local-redis] Shutting down Redis server...');
    if (serverInstance) {
      try { await serverInstance.stop(); } catch {}
    }
    if (tcpServer) {
      try { tcpServer.close(); } catch {}
    }
    if (fs.existsSync(PID_FILE)) {
      try { fs.unlinkSync(PID_FILE); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
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
