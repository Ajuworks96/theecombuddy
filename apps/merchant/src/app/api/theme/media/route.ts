import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    ensureUploadsDir();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = (formData.get("type") as string) || "general"; // logo, favicon, hero, banner

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed is 5 MB.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type '${file.type}'. Allowed: JPEG, PNG, WebP, SVG, ICO.`,
        },
        { status: 400 }
      );
    }

    // 3. Generate sanitized unique filename
    const buffer = Buffer.from(await file.arrayBuffer());

    // SVG security audit: reject embedded scripts and event handlers
    if (file.type === "image/svg+xml") {
      const text = buffer.toString("utf-8");
      if (/<script\b/i.test(text) || /\bon\w+\s*=/i.test(text) || /javascript:/i.test(text)) {
        return NextResponse.json(
          { error: "SVG contains unsafe script elements or event handlers" },
          { status: 400 }
        );
      }
    }

    const ext = path.extname(file.name).toLowerCase() || (file.type === "image/svg+xml" ? ".svg" : ".png");
    const safeBaseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
    const uniqueFileName = `theme_${assetType}_${Date.now()}_${safeBaseName}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json(
      {
        message: "Theme asset uploaded successfully",
        asset: {
          filename: uniqueFileName,
          url: publicUrl,
          size: file.size,
          mimeType: file.type,
          type: assetType,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to upload theme asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  // Safety check: Prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, sanitizedFilename);

  try {
    // Phase 9 requirement: Do not delete assets still referenced by published configurations
    const publishedTheme = await themeService.getTheme("published").catch(() => null);
    if (publishedTheme) {
      const publishedJson = JSON.stringify(publishedTheme);
      if (publishedJson.includes(sanitizedFilename)) {
        return NextResponse.json(
          {
            error: "Cannot delete asset: file is currently referenced in the published theme configuration.",
          },
          { status: 409 }
        );
      }
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({
        message: `Asset '${sanitizedFilename}' deleted successfully`,
      });
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete asset" },
      { status: 500 }
    );
  }
}
