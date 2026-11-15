import { NextResponse } from "next/server";
import { isUuid, parseLeadDraft, readJson } from "@/lib/leads";
import { logError } from "@/lib/log";
import { buildMailto } from "@/lib/mailto";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isUuid(params.id)) {
    return NextResponse.json({ ok: false, error: "Onbekende lead." }, { status: 404 });
  }

  const parsed = parseLeadDraft(await readJson(request));
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  if (!parsed.draft.contact_email) {
    return NextResponse.json({ ok: false, error: "Vul een e-mailadres in van de HR-afdeling." }, { status: 400 });
  }
  if (!parsed.draft.ai_pitch) {
    return NextResponse.json({ ok: false, error: "Er is nog geen pitch om te versturen." }, { status: 400 });
  }

  let mailto = "";
  try {
    mailto = buildMailto(parsed.draft.contact_email, parsed.draft.ai_pitch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "De mail kon niet worden opgebouwd.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .update({
        contact_person: parsed.draft.contact_person,
        contact_email: parsed.draft.contact_email,
        ai_pitch: parsed.draft.ai_pitch,
        status: "sent",
      })
      .eq("id", params.id)
      .select("id, status, contact_email")
      .maybeSingle();

    if (error) {
      logError("leads.send", new Error(error.message), { leadId: params.id });
      return NextResponse.json({ ok: false, error: "Status bijwerken mislukt." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ ok: false, error: "Lead niet gevonden." }, { status: 404 });

    return NextResponse.json({ ok: true, mailto, lead: data });
  } catch (error) {
    logError("leads.send", error, { leadId: params.id });
    return NextResponse.json({ ok: false, error: "Versturen lukte niet." }, { status: 500 });
  }
}
