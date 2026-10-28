const path = require('path');
const fs = require('fs');

const epModule = require('embedded-postgres');
const EmbeddedPostgres = epModule.default || epModule;

const DB_DIR = path.resolve(__dirname, '../data/local-postgres');
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'medusa_ecom_buddy';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'password';

const PID_FILE = path.resolve(__dirname, '../data/local-db.pid');

function getPgInstance() {
  return new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: DB_USER,
    password: DB_PASS,
    port: DB_PORT,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
}

async function start() {
  console.log(`[local-db] Starting PostgreSQL on port ${DB_PORT}...`);
  fs.mkdirSync(path.dirname(DB_DIR), { recursive: true });

  const pg = getPgInstance();
  try {
    if (!fs.existsSync(DB_DIR)) {
      console.log('[local-db] Initializing new PostgreSQL cluster...');
      await pg.initialise();
    }

    console.log('[local-db] Booting PostgreSQL daemon...');
    await pg.start();

    // Verify or create database
    try {
      await pg.createDatabase(DB_NAME);
      console.log(`[local-db] Database '${DB_NAME}' created.`);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('42P04'))) {
        console.log(`[local-db] Database '${DB_NAME}' is ready.`);
      } else {
        console.warn(`[local-db] Note on database creation: ${err.message}`);
      }
    }

    fs.writeFileSync(PID_FILE, JSON.stringify({ port: DB_PORT, startedAt: new Date().toISOString() }));
    console.log(`[local-db] PostgreSQL is listening on postgres://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}`);
  } catch (err) {
    console.error('[local-db] Failed to start PostgreSQL:', err);
    process.exit(1);
  }
}

async function stop() {
  console.log('[local-db] Stopping PostgreSQL cluster...');
  const pg = getPgInstance();
  try {
    await pg.stop();
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    console.log('[local-db] PostgreSQL cluster stopped successfully.');
  } catch (err) {
    console.error('[local-db] Error stopping cluster:', err.message);
  }
}

async function status() {
  const isRunning = fs.existsSync(PID_FILE);
  console.log(`[local-db] PostgreSQL status: ${isRunning ? 'RUNNING (PID file present)' : 'STOPPED'}`);
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
    console.log(`Usage: node deploy/scripts/local-db.js [start|stop|status]`);
    process.exit(1);
}

