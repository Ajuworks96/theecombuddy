const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('[security] Initiating admin password rotation via Medusa CLI & Auth Service...');
  const backendDir = path.resolve(__dirname, '../../apps/backend');

  execSync('npx medusa exec ./src/scripts/rotate-admin-password.ts', {
    cwd: backendDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${process.env.APPDATA}\\fnm\\node-versions\\v22.23.4\\installation;${process.env.PATH}`,
    },
  });

  console.log('[security] Password rotation workflow completed successfully.');
} catch (err) {
  console.error('[security] Error running password rotation workflow:', err.message);
  process.exit(1);
}
