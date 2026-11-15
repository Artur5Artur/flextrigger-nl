"use server";

import { revalidatePath } from "next/cache";
import { runMarketScan, type ScanResult } from "@/lib/scan";

export async function scanMarket(): Promise<ScanResult> {
  const result = await runMarketScan({ demo: false });
  revalidatePath("/dashboard");
  return result;
}

export async function scanDemo(): Promise<ScanResult> {
  const result = await runMarketScan({ demo: true });
  revalidatePath("/dashboard");
  return result;
}
