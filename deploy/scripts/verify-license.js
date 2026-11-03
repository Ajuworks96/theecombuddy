#!/usr/bin/env node
/**
 * THE ECOM BUDDY — Offline Perpetual License Verification Script
 * Validates cryptographic license signatures and domain rules offline with ZERO network calls.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkbH2PoAQGSBuKtOxu/8L
qCpv5cD1AwTZbVALeRVWTSff0vLAX/1vFbfOC2Mm0YpV4mLyQrLFhWcv/F2fbvpy
bOa1lSxQ+g5c6ddGA1xh1twXw9nzwakr+mSdI2T2D7CgkQWdoSJH34FahEudniNC
QpudEp1fHfWbO4Qy+BdLXMEV/sMtBbKa8gr545CUMEyd5Q/Ud8rfqFCvKAl00I/S
BIRHyFBn9Ouc4h8BDT/VlOBZqYsgnbjDWM5Y74ok8nd2z2oCiuHzW+ZCcEW0MZU4
ah8p4C4TFFJHuJ5flAdP+ipw9r23GEWcbvaLhWVQk29hpfGz8jYxbscG1yVDZgZH
MwIDAQAB
-----END PUBLIC KEY-----`;

function canonicalizePayload(payload) {
  const clone = { ...payload };
  delete clone.signature;
  const sortedKeys = Object.keys(clone).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = clone[key];
  }
  return JSON.stringify(sortedObj);
}

function verifyLicenseManifest(manifest, activeDomain = null, publicKeyPem = PUBLIC_KEY_PEM) {
  if (!manifest || typeof manifest !== "object") {
    return {
      valid: false,
      status: "unlicensed",
      message: "No license manifest provided. Running in evaluation mode.",
    };
  }

  if (!manifest.signature) {
    return {
      valid: false,
      status: "invalid_signature",
      message: "License manifest is missing cryptographic signature.",
    };
  }

  try {
    const canonicalData = canonicalizePayload(manifest);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(canonicalData);
    verifier.end();

    const signatureValid = verifier.verify(publicKeyPem, manifest.signature, "base64");
    if (!signatureValid) {
      return {
        valid: false,
        status: "invalid_signature",
        message: "Cryptographic signature verification failed. License is invalid or altered.",
      };
    }

    // Domain validation if activeDomain is provided
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
          message: `Active host '${activeDomain}' is not listed in permitted domains (${permitted.join(", ")}). Admin warning active.`,
          license: manifest,
        };
      }
    }

    return {
      valid: true,
      status: "valid",
      message: `Licensed to ${manifest.licensee_name} (Perpetual Single-Merchant License)`,
      license: manifest,
      licensee: manifest.licensee_name,
      permitted_domains: manifest.permitted_domains,
      issue_date: manifest.issue_date,
      license_type: manifest.license_type,
    };
  } catch (err) {
    return {
      valid: false,
      status: "invalid_signature",
      message: `Verification exception: ${err.message}`,
    };
  }
}

if (require.main === module) {
  const licensePath = process.argv[2] || path.resolve(__dirname, "../license.json");
  const host = process.argv[3] || "localhost";

  if (!fs.existsSync(licensePath)) {
    console.error(`[verify-license] License file not found at: ${licensePath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(licensePath, "utf8"));
  const result = verifyLicenseManifest(manifest, host);
  console.log(`[verify-license] Host: ${host}`);
  console.log(`[verify-license] Result:`, JSON.stringify(result, null, 2));
  if (!result.valid) {
    process.exit(1);
  }
}

module.exports = { verifyLicenseManifest, canonicalizePayload, PUBLIC_KEY_PEM };
