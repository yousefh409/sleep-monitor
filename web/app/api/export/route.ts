import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [telemetry, nights, reports] = await Promise.all([
    pool.query(`SELECT * FROM telemetry ORDER BY ts ASC`),
    pool.query(`SELECT * FROM nights    ORDER BY started_at ASC`),
    pool.query(`SELECT * FROM reports   ORDER BY generated_at ASC`),
  ]);

  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      counts: {
        telemetry: telemetry.rowCount,
        nights: nights.rowCount,
        reports: reports.rowCount,
      },
      telemetry: telemetry.rows,
      nights: nights.rows,
      reports: reports.rows,
    },
    {
      headers: {
        "content-disposition": `attachment; filename=sleep-backup-${
          new Date().toISOString().slice(0, 10)
        }.json`,
      },
    }
  );
}
