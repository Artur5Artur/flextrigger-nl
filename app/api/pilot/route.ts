import { NextResponse } from "next/server";
import { logError } from "@/lib/log";
import { isValidEmail } from "@/lib/mailto";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Ongeldige invoer." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const trap = typeof record.websiteConfirm === "string" ? record.websiteConfirm.trim() : "";
  if (trap) return NextResponse.json({ ok: true });

  const agencyName = clip(record.agencyName, 120);
  const contactName = clip(record.contactName, 120);
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const city = clip(record.city, 80);

  if (agencyName.length < 2) {
    return NextResponse.json({ ok: false, error: "Vul de naam van het uitzendbureau in." }, { status: 400 });
  }
  if (contactName.length < 2) {
    return NextResponse.json({ ok: false, error: "Vul je naam in." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("pilot_requests").insert({
      agency_name: agencyName,
      contact_name: contactName,
      email,
      city: city || null,
    });
    if (error) {
      logError("pilot.save", new Error(error.message));
      return NextResponse.json(
        { ok: false, error: "Opslaan mislukt. Controleer of database/schema.sql is uitgevoerd." },
        { status: 500 },
      );
    }
  } catch (error) {
    logError("pilot.save", error);
    return NextResponse.json({ ok: false, error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
