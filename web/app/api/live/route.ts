import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = url.searchParams.get("device") ?? "sleep01";
  const { rows } = await pool.query(
    `SELECT extract(epoch FROM ts)::int AS t, presence, in_bed, sleep_state,
            breathing, heart_rate, temp_c, humidity, pressure_hpa, gas_ohm, db_spl, light_raw,
            hum_presence, hum_motion, hum_range, hum_dist_cm
     FROM telemetry
     WHERE device = $1 AND ts > now() - interval '10 minutes'
     ORDER BY ts ASC`,
    [device]
  );
  return NextResponse.json({ device, rows });
}
