import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = url.searchParams.get("device") ?? "sleep01";
  const minutes = Math.min(
    Math.max(parseInt(url.searchParams.get("minutes") ?? "10", 10) || 10, 1),
    1440 * 7 // cap at 7 days
  );
  const { rows } = await pool.query(
    `SELECT extract(epoch FROM ts)::int AS t, *
     FROM telemetry
     WHERE device = $1 AND ts > now() - ($2 || ' minutes')::interval
     ORDER BY ts ASC`,
    [device, minutes]
  );
  return NextResponse.json({ device, minutes, rows });
}
