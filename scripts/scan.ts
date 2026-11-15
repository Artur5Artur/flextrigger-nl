import { config } from "dotenv";
import { resolve } from "node:path";
import { runMarketScan } from "../lib/scan";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const demo = process.argv.includes("--demo");
  const result = await runMarketScan({ demo });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
