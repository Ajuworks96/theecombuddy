import { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export default async function rotatePasswordScript({ container }: { container: MedusaContainer }) {
  const newPassword = process.env.NEW_ADMIN_PASSWORD || crypto.randomBytes(24).toString("base64url");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@theecombuddy.local";

  const authService = container.resolve(Modules.AUTH);
  console.log(`[security] Invoking Medusa AuthModuleService.updateProvider for '${adminEmail}'...`);

  const result = await authService.updateProvider("emailpass", {
    entity_id: adminEmail,
    password: newPassword,
  });

  if (!result.success) {
    throw new Error(`Medusa AuthModuleService update rejected: ${result.error}`);
  }
  console.log("[security] Password rotated successfully via official Medusa AuthModuleService.");

  // Safely persist to local git-ignored apps/backend/.env
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("DEV_ADMIN_PASSWORD=")) {
      envContent = envContent.replace(/DEV_ADMIN_PASSWORD=.*/, `DEV_ADMIN_PASSWORD=${newPassword}`);
    } else {
      envContent += `\n# Local rotated admin credential (DO NOT COMMIT)\nDEV_ADMIN_PASSWORD=${newPassword}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("[security] Rotated password safely stored in local apps/backend/.env");
  }

  // Verify through official Medusa authentication workflow
  const verifyResult = await authService.authenticate("emailpass", {
    body: { email: adminEmail, password: newPassword },
  });

  if (!verifyResult.success || !verifyResult.authIdentity) {
    throw new Error(`Authentication verification failed: ${verifyResult.error}`);
  }
  console.log("[security] Official Medusa Auth verification successful (Identity confirmed).");
}

