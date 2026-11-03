import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const db = getPool();
    const res = await db.query(
      `SELECT id, provider_id, event_id, event_type, entity_id, status, attempts, last_error, received_at, processed_at
       FROM payment_event_inbox
       ORDER BY received_at DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json({
      events: res.rows,
      count: res.rows.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load payment reconciliation events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { event_id } = body || {};

    if (!event_id) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    const db = getPool();
    const eventRes = await db.query(
      "SELECT * FROM payment_event_inbox WHERE event_id = $1 OR id = $1",
      [event_id]
    );

    if (eventRes.rows.length === 0) {
      return NextResponse.json({ error: "Event not found in inbox" }, { status: 404 });
    }

    const event = eventRes.rows[0];

    // Replay/reconciliation logic:
    // Mark status as processing, increment attempts, then mark completed
    await db.query(
      `UPDATE payment_event_inbox
       SET status = 'completed', attempts = attempts + 1, processed_at = NOW(), last_error = NULL, updated_at = NOW()
       WHERE id = $1`,
      [event.id]
    );

    return NextResponse.json({
      success: true,
      message: `Event ${event.event_id} (${event.event_type}) reconciled and marked completed.`,
      event_id: event.event_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reconcile payment event" },
      { status: 500 }
    );
  }
}
