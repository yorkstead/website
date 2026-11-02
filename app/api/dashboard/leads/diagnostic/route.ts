import { NextResponse } from "next/server";
import { contactDatabase } from "@/lib/contact-inquiries";
import { getOwnerSession } from "@/lib/owner-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex",
  Vary: "Cookie",
};
export async function GET(request: Request) {
  if (!(await getOwnerSession(request.headers))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: privateHeaders },
    );
  }

  if (new URL(request.url).searchParams.has("mode")) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: privateHeaders },
    );
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return NextResponse.json(
      { error: "database_not_configured" },
      { status: 503, headers: privateHeaders },
    );
  }

  try {
    const database = new URL(raw);
    const sql = await contactDatabase();
    const rows = await sql`SELECT COUNT(*)::int total,
    COUNT(*) FILTER (WHERE status NOT IN ('won','lost','archived') AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id))::int active
    FROM contact_inquiries`;
    const counts = rows[0] || {};
    return NextResponse.json(
      {
        hostname: database.hostname,
        database: database.pathname.slice(1),
        total: Number(counts.total || 0),
        active: Number(counts.active || 0),
      },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "database_check_failed" },
      { status: 503, headers: privateHeaders },
    );
  }
}
