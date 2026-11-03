import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/session";
import { readInstalledLicense, verifyLicense, getLicenseFilePath } from "@/lib/license";
import type { LicenseManifest } from "@the-ecom-buddy/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const host = req.headers.get("host")?.split(":")[0] || "localhost";
  const manifest = readInstalledLicense();
  const verification = verifyLicense(manifest, host);

  return NextResponse.json({
    verification,
    installed: Boolean(manifest),
    licensePath: getLicenseFilePath(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const manifest: LicenseManifest = typeof body === "string" ? JSON.parse(body) : body;

    const host = req.headers.get("host")?.split(":")[0] || "localhost";
    const verification = verifyLicense(manifest, host);

    if (!verification.valid) {
      return NextResponse.json(
        { message: verification.message, verification },
        { status: 400 }
      );
    }

    // Save verified license
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "License installed successfully and cryptographically verified offline.",
      verification,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Invalid license format: ${err.message}` },
      { status: 400 }
    );
  }
}
