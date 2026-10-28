const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const scryptKdf = require('scrypt-kdf');
const { Client } = require('pg');

async function rotateAdminPassword() {
  const newPassword = process.env.NEW_ADMIN_PASSWORD || crypto.randomBytes(24).toString('base64url');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@theecombuddy.local';

  // 1. Hash with scrypt-kdf matching Medusa v2 emailpass provider settings
  const hash = await scryptKdf.kdf(newPassword, { logN: 15, r: 8, p: 1 });
  const hashBase64 = hash.toString('base64');

  // 2. Update PostgreSQL database
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/medusa_ecom_buddy';
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const updateQuery = `
    UPDATE provider_identity 
    SET provider_metadata = jsonb_build_object('password', $1::text), 
        updated_at = NOW() 
    WHERE entity_id = $2 
    RETURNING id;
  `;

  const updateRes = await client.query(updateQuery, [hashBase64, adminEmail]);
  if (updateRes.rowCount === 0) {
    throw new Error(`Admin user '${adminEmail}' not found in provider_identity table.`);
  }
  console.log(`[security] Admin credentials updated in database for: ${adminEmail} (Rows: ${updateRes.rowCount})`);
  await client.end();

  // 3. Persist new credential strictly to git-ignored apps/backend/.env
  const envPath = path.resolve(__dirname, '../../apps/backend/.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('DEV_ADMIN_PASSWORD=')) {
      envContent = envContent.replace(/DEV_ADMIN_PASSWORD=.*/, `DEV_ADMIN_PASSWORD=${newPassword}`);
    } else {
      envContent += `\n# Local rotated admin credential (DO NOT COMMIT)\nDEV_ADMIN_PASSWORD=${newPassword}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log('[security] Rotated password safely stored in local apps/backend/.env');
  }

  // 4. Test authenticated login endpoint with new password
  const backendUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
  const loginRes = await fetch(`${backendUrl}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: newPassword }),
  });

  console.log(`[security] Auth login test response status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    const errorBody = await loginRes.text();
    throw new Error(`Auth verification failed with status ${loginRes.status}: ${errorBody}`);
  }

  const authData = await loginRes.json();
  const tokenReceived = Boolean(authData.token);
  console.log(`[security] Password rotation verified successfully. Bearer token generated: ${tokenReceived}`);
}

rotateAdminPassword().catch((err) => {
  console.error('[security] Error rotating admin password:', err.message);
  process.exit(1);
});
