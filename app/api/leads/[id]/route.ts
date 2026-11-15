import { NextResponse } from "next/server";
import { isUuid, parseLeadDraft, readJson } from "@/lib/leads";
import { logError } from "@/lib/log";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isUuid(params.id)) {
    return NextResponse.json({ ok: false, error: "Onbekende lead." }, { status: 404 });
  }

  const parsed = parseLeadDraft(await readJson(request));
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .update({
        contact_person: parsed.draft.contact_person,
        contact_email: parsed.draft.contact_email,
        ai_pitch: parsed.draft.ai_pitch,
      })
      .eq("id", params.id)
      .select("id, contact_person, contact_email, ai_pitch, status")
      .maybeSingle();

    if (error) {
      logError("leads.update", new Error(error.message), { leadId: params.id });
      return NextResponse.json({ ok: false, error: "Opslaan mislukt." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ ok: false, error: "Lead niet gevonden." }, { status: 404 });
    return NextResponse.json({ ok: true, lead: data });
  } catch (error) {
    logError("leads.update", error, { leadId: params.id });
    return NextResponse.json({ ok: false, error: "Opslaan mislukt." }, { status: 500 });
  }
}
