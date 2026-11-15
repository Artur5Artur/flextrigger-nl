import { NextResponse } from "next/server";
import { isUuid } from "@/lib/leads";
import { logError } from "@/lib/log";
import { generateAIPitch } from "@/lib/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  if (!isUuid(params.id)) {
    return NextResponse.json({ ok: false, error: "Onbekende lead." }, { status: 404 });
  }

  try {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      id,
      vacancy:vacancies (
        title,
        location,
        company:companies ( name, city )
      )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    logError("openrouter.regenerate", new Error(error.message), { leadId: params.id, step: "read" });
    return NextResponse.json({ ok: false, error: "Lead ophalen mislukt." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "Lead niet gevonden." }, { status: 404 });

  const vacancy = one(data.vacancy);
  const vacancyRecord = asRecord(vacancy);
  const company = one(vacancyRecord.company);
  const companyRecord = asRecord(company);
  const title = textField(vacancyRecord.title) || "logistieke vacature";
  const companyName = textField(companyRecord.name) || "uw organisatie";
  const city = textField(companyRecord.city) || textField(vacancyRecord.location) || "Nederland";

  try {
    const aiPitch = await generateAIPitch(title, companyName, city);
    const { error: updateError } = await supabase
      .from("leads")
      .update({ ai_pitch: aiPitch, status: "pending" })
      .eq("id", params.id);
    if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, ai_pitch: aiPitch, status: "pending" });
  } catch (pitchError) {
    logError("openrouter.regenerate", pitchError, { leadId: params.id });
    const message = pitchError instanceof Error ? pitchError.message : "Pitch genereren mislukt.";
    try {
      await supabase.from("leads").update({ status: "pitch_failed" }).eq("id", params.id);
    } catch (updateError) {
      logError("openrouter.regenerate", updateError, { leadId: params.id, step: "mark-failed" });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
  } catch (error) {
    logError("openrouter.regenerate", error, { leadId: params.id });
    return NextResponse.json({ ok: false, error: "Pitch genereren mislukt." }, { status: 500 });
  }
}

function one(value: unknown): unknown {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function textField(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
