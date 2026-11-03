import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { LicenseManifest, LicenseVerificationResult } from "@the-ecom-buddy/types";

export const VENDOR_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkbH2PoAQGSBuKtOxu/8L
qCpv5cD1AwTZbVALeRVWTSff0vLAX/1vFbfOC2Mm0YpV4mLyQrLFhWcv/F2fbvpy
bOa1lSxQ+g5c6ddGA1xh1twXw9nzwakr+mSdI2T2D7CgkQWdoSJH34FahEudniNC
QpudEp1fHfWbO4Qy+BdLXMEV/sMtBbKa8gr545CUMEyd5Q/Ud8rfqFCvKAl00I/S
BIRHyFBn9Ouc4h8BDT/VlOBZqYsgnbjDWM5Y74ok8nd2z2oCiuHzW+ZCcEW0MZU4
ah8p4C4TFFJHuJ5flAdP+ipw9r23GEWcbvaLhWVQk29hpfGz8jYxbscG1yVDZgZH
MwIDAQAB
-----END PUBLIC KEY-----`;

function canonicalizePayload(payload: any): string {
  const clone = { ...payload };
  delete clone.signature;
  const sortedKeys = Object.keys(clone).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = clone[key];
  }
  return JSON.stringify(sortedObj);
}

export function getLicenseFilePath(): string {
  if (process.env.LICENSE_FILE_PATH) {
    return path.resolve(process.env.LICENSE_FILE_PATH);
  }
  // Search common locations
  const candidates = [
    path.resolve(process.cwd(), "deploy/license.json"),
    path.resolve(process.cwd(), "../../deploy/license.json"),
    path.resolve(process.cwd(), "../deploy/license.json"),
    path.resolve(process.cwd(), "license.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function readInstalledLicense(): LicenseManifest | null {
  try {
    const filePath = getLicenseFilePath();
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as LicenseManifest;
  } catch {
    return null;
  }
}

export function verifyLicense(
  manifest: LicenseManifest | null,
  activeDomain?: string
): LicenseVerificationResult {
  if (!manifest) {
    return {
      valid: false,
      status: "unlicensed",
      message: "No perpetual license file detected. System running in evaluation mode.",
    };
  }

  if (!manifest.signature) {
    return {
      valid: false,
      status: "invalid_signature",
      message: "License signature missing. System running in evaluation mode.",
    };
  }

  try {
    const canonicalData = canonicalizePayload(manifest);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(canonicalData);
    verifier.end();

    const signatureValid = verifier.verify(VENDOR_PUBLIC_KEY, manifest.signature, "base64");
    if (!signatureValid) {
      return {
        valid: false,
        status: "invalid_signature",
        message: "Cryptographic signature mismatch. License manifest has been altered or forged.",
      };
    }

    if (activeDomain) {
      const permitted = manifest.permitted_domains || [];
      const domainMatches = permitted.some((p) => {
        if (p === "*") return true;
        if (p.startsWith("*.")) {
          const suffix = p.slice(2);
          return activeDomain === suffix || activeDomain.endsWith(`.${suffix}`);
        }
        return activeDomain.toLowerCase() === p.toLowerCase();
      });

      if (!domainMatches) {
        return {
          valid: true,
          status: "domain_mismatch",
          message: `Active domain '${activeDomain}' is outside permitted domains (${permitted.join(", ")}). Dashboard warning active.`,
          license: manifest,
          licensee: manifest.licensee_name,
          permitted_domains: manifest.permitted_domains,
          issue_date: manifest.issue_date,
          license_type: manifest.license_type,
        };
      }
    }

    return {
      valid: true,
      status: "valid",
      message: `Licensed to ${manifest.licensee_name} (Perpetual License)`,
      license: manifest,
      licensee: manifest.licensee_name,
      permitted_domains: manifest.permitted_domains,
      issue_date: manifest.issue_date,
      license_type: manifest.license_type,
    };
  } catch (err: any) {
    return {
      valid: false,
      status: "invalid_signature",
      message: `License validation error: ${err.message}`,
    };
  }
}
