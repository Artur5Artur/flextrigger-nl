import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { logError } from "@/lib/log";
import { runMarketScan } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Niet gemachtigd." }, { status: 401 });
  }

  const demo = new URL(request.url).searchParams.get("demo") === "1";
  try {
    const result = await runMarketScan({ demo });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    logError("zenrows.cron", error, { demo });
    return NextResponse.json({ ok: false, error: "Scan mislukt." }, { status: 500 });
  }
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  const bearer = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, "").trim() : "";
  const alternate = request.headers.get("x-cron-secret")?.trim() ?? "";
  return sameSecret(bearer, secret) || sameSecret(alternate, secret);
}

function sameSecret(candidate: string, secret: string): boolean {
  if (!candidate) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
