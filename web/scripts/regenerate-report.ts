import { config } from "dotenv";
config({ path: ".env.local" });

import { pool } from "../lib/db";
import { buildAndStoreReport } from "../lib/sleepReport";

async function main() {
  const idArg = process.argv[2];
  if (!idArg) {
    console.error("usage: npx tsx scripts/regenerate-report.ts <night_id>");
    process.exit(1);
  }
  const nightId = Number(idArg);
  if (!Number.isInteger(nightId) || nightId <= 0) {
    console.error(`invalid night id: ${idArg}`);
    process.exit(1);
  }

  const { rows } = await pool.query<{
    device: string;
    started_at: string;
    ended_at: string;
  }>(
    `SELECT device, started_at, ended_at FROM nights WHERE id = $1`,
    [nightId],
  );
  if (rows.length === 0) {
    console.error(`night not found: ${nightId}`);
    process.exit(1);
  }

  const { device, started_at, ended_at } = rows[0];
  console.log(`Regenerating report for night ${nightId} (device=${device}) ...`);

  const result = await buildAndStoreReport(
    device,
    nightId,
    new Date(started_at),
    new Date(ended_at),
  );

  console.log(`Done. score=${result.sleep_score}`);
  console.log(`headline: ${result.headline}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
