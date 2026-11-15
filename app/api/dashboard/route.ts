import { NextResponse } from "next/server";
import { loadDashboard } from "@/lib/dashboard";
import { hasServiceRoleConfig } from "@/lib/env";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ configured: false, leads: [], companies: [], pilotRequests: [] });
  }

  try {
    const data = await loadDashboard();
    return NextResponse.json({ configured: true, ...data });
  } catch (error) {
    logError("dashboard.load", error);
    const message = error instanceof Error ? error.message : "Dashboard laden mislukt.";
    return NextResponse.json(
      { configured: true, leads: [], companies: [], error: message },
      { status: 500 },
    );
  }
}
