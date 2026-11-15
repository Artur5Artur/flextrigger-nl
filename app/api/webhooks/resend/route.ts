import { NextResponse } from "next/server";
import { Resend } from "resend";
import { emailStatusFromEvent, leadIdFromTags, nextEmailStatus, type EmailTrackingStatus } from "@/lib/email-status";
import { isUuid } from "@/lib/leads";
import { isValidEmail } from "@/lib/mailto";
import { logError } from "@/lib/log";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendEmailEvent = {
  type?: string;
  data?: { email_id?: string; to?: string[]; tags?: unknown };
};

type LeadRow = {
  id: string;
  status: string;
  email_status: string | null;
  resend_email_id: string | null;
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    logError("resend.webhook", new Error("RESEND_WEBHOOK_SECRET ontbreekt"));
    return NextResponse.json({ success: false, error: "Omgevingsvariabele RESEND_WEBHOOK_SECRET ontbreekt." }, { status: 500 });
  }

  let payload = "";
  try {
    payload = await request.text();
  } catch (error) {
    logError("resend.webhook", error, { reason: "unread-body" });
    return NextResponse.json({ success: false, error: "Ongeldige invoer." }, { status: 400 });
  }
  if (!payload.trim()) {
    return NextResponse.json({ success: false, error: "Lege webhook." }, { status: 400 });
  }
  if (payload.length > 1_000_000) {
    logError("resend.webhook", new Error("Payload te groot"), { bytes: payload.length });
    return NextResponse.json({ success: false, error: "Webhook is te groot." }, { status: 413 });
  }

  const id = header(request, "svix-id", "webhook-id");
  const timestamp = header(request, "svix-timestamp", "webhook-timestamp");
  const signature = header(request, "svix-signature", "webhook-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ success: false, error: "Ontbrekende webhookhandtekening." }, { status: 400 });
  }

  let event: ResendEmailEvent;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as ResendEmailEvent;
  } catch (error) {
    logError("resend.webhook", error, { reason: "invalid-signature" });
    return NextResponse.json({ success: false, error: "Ongeldige webhookhandtekening." }, { status: 400 });
  }

  const emailId = typeof event.data?.email_id === "string" ? event.data.email_id.trim() : "";
  const incoming = emailStatusFromEvent(event.type ?? "");
  if (incoming !== "delivered" && incoming !== "opened") {
    return NextResponse.json({ success: true });
  }
  if (!emailId || emailId.length > 200) {
    return NextResponse.json({ success: true });
  }

  try {
    await applyEmailStatus({
      emailId,
      leadId: leadIdFromTags(event.data?.tags),
      recipients: recipientList(event.data?.to),
      incoming,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("resend.webhook", error, { event: event.type ?? null });
    return NextResponse.json({ success: false, error: "Status bijwerken mislukt." }, { status: 500 });
  }
}

function recipientList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return [value];
  return [];
}

function header(request: Request, primary: string, fallback: string): string | null {
  return request.headers.get(primary) ?? request.headers.get(fallback);
}

async function applyEmailStatus(input: {
  emailId: string;
  leadId: string | null;
  recipients: string[];
  incoming: EmailTrackingStatus;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const lead = await findLead(supabase, input);
  if (!lead) return false;

  const emailStatus = nextEmailStatus(lead.email_status, input.incoming);
  const patch: Record<string, string> = {};
  if (emailStatus) patch.email_status = emailStatus;
  if (!lead.resend_email_id) patch.resend_email_id = input.emailId;
  if (lead.status === "pending") patch.status = "sent";
  if (Object.keys(patch).length === 0) return true;

  const { error } = await supabase.from("leads").update(patch).eq("id", lead.id);
  if (error && patch.resend_email_id) {
    delete patch.resend_email_id;
    if (Object.keys(patch).length === 0) return true;
    const retry = await supabase.from("leads").update(patch).eq("id", lead.id);
    if (retry.error) throw new Error(retry.error.message);
    return true;
  }
  if (error) throw new Error(error.message);
  return true;
}

async function findLead(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: { emailId: string; leadId: string | null; recipients: string[] },
): Promise<LeadRow | null> {
  const columns = "id, status, email_status, resend_email_id";
  const byResend = await supabase.from("leads").select(columns).eq("resend_email_id", input.emailId).maybeSingle();
  if (byResend.error) throw new Error(byResend.error.message);
  if (byResend.data) return byResend.data as LeadRow;

  if (input.leadId && isUuid(input.leadId)) {
    const byId = await supabase.from("leads").select(columns).eq("id", input.leadId).maybeSingle();
    if (byId.error) throw new Error(byId.error.message);
    if (byId.data) return byId.data as LeadRow;
  }

  const recipient = input.recipients.map((value) => value.trim().toLowerCase()).find((value) => isValidEmail(value));
  if (!recipient) return null;
  const byEmail = await supabase
    .from("leads")
    .select(columns)
    .eq("contact_email", recipient)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmail.error) throw new Error(byEmail.error.message);
  return (byEmail.data as LeadRow | null) ?? null;
}
