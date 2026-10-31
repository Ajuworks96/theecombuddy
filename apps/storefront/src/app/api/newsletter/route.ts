import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");

interface SubscriberRecord {
  email: string;
  consent: boolean;
  subscribedAt: string;
  source: string;
}

function ensureSubscribersFile(): SubscriberRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2), "utf8");
    return [];
  }
  try {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSubscribers(records: SubscriberRecord[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(records, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, consent, source } = body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (consent !== true) {
      return NextResponse.json(
        { error: "Explicit subscriber consent is required to join store communications" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = ensureSubscribersFile();

    const alreadySubscribed = existing.find((s) => s.email === cleanEmail);
    if (alreadySubscribed) {
      return NextResponse.json(
        {
          success: true,
          message: "You are already subscribed to store updates.",
          email: cleanEmail,
        },
        { status: 200 }
      );
    }

    const newRecord: SubscriberRecord = {
      email: cleanEmail,
      consent: true,
      subscribedAt: new Date().toISOString(),
      source: typeof source === "string" ? source.slice(0, 50) : "storefront",
    };

    existing.push(newRecord);
    saveSubscribers(existing);

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for subscribing! Your email has been added to our updates list.",
        email: cleanEmail,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process newsletter subscription" },
      { status: 500 }
    );
  }
}

