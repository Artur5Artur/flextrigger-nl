import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logError } from "@/lib/log";
import { splitPitch } from "@/lib/mailto";
import { parseSendEmailInput, senderAddress } from "@/lib/send-email-input";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FROM = "FlexTrigger NL <onboarding@resend.dev>";
const RECIPIENT_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      logError("resend.send", new Error("RESEND_API_KEY ontbreekt"));
      return NextResponse.json(
        { success: false, error: "Omgevingsvariabele RESEND_API_KEY ontbreekt." },
        { status: 500 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      logError("resend.send", error, { reason: "invalid-json" });
      return NextResponse.json({ success: false, error: "Ongeldige invoer." }, { status: 400 });
    }

    const recipient = readRecipient(payload);
    if (recipient !== undefined && !isDeliverableRecipient(recipient)) {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 });
    }

    const parsed = parseSendEmailInput(payload);
    if ("error" in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const { to, subject, htmlContent, leadId } = parsed.input;
    if (leadId) {
      const prior = await leadSendState(leadId);
      if (prior === "missing") {
        return NextResponse.json({ success: false, error: "Lead niet gevonden." }, { status: 404 });
      }
      if (prior === "sent") {
        return NextResponse.json({ success: false, error: "Deze pitch is al verstuurd." }, { status: 409 });
      }
    }

    const from = senderAddress(process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM);
    if (!from) {
      logError("resend.send", new Error("Ongeldig afzenderadres"));
      return NextResponse.json({ success: false, error: "Het afzenderadres is ongeldig." }, { status: 500 });
    }

    const parsedPitch = splitPitch(htmlContent);
    if (!isDeliverableRecipient(to)) {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: subject || parsedPitch.subject,
      html: pitchToHtml(parsedPitch.body || htmlContent),
      ...(leadId ? { tags: [{ name: "lead_id", value: leadId }] } : {}),
    });

    if (error) {
      logError("resend.send", new Error(error.message), { leadId });
      return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }

    const tracked = leadId && data?.id ? await rememberEmail(leadId, data.id) : false;
    return NextResponse.json({ success: true, data, tracked });
  } catch (error) {
    logError("resend.send", error);
    const message = error instanceof Error ? error.message : "Versturen via Resend lukte niet.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function leadSendState(leadId: string): Promise<"open" | "sent" | "missing"> {
  try {
    const supabase = createSupabaseAdminClient();
    const full = await supabase.from("leads").select("status, email_status").eq("id", leadId).maybeSingle();
    if (!full.error && full.data) {
      const row = full.data as { status?: string; email_status?: string | null };
      if (row.status === "sent" || row.email_status) return "sent";
      return "open";
    }
    if (full.error && !/email_status|schema cache|column/i.test(full.error.message)) {
      logError("resend.send", new Error(full.error.message), { leadId, step: "lookup" });
      return "open";
    }
    const basic = await supabase.from("leads").select("status").eq("id", leadId).maybeSingle();
    if (basic.error) {
      logError("resend.send", new Error(basic.error.message), { leadId, step: "lookup" });
      return "open";
    }
    if (!basic.data) return "missing";
    return (basic.data as { status?: string }).status === "sent" ? "sent" : "open";
  } catch (error) {
    logError("resend.send", error, { leadId, step: "lookup" });
    return "open";
  }
}

async function rememberEmail(leadId: string, resendEmailId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("leads")
      .update({ resend_email_id: resendEmailId, email_status: "sent" })
      .eq("id", leadId);
    if (error) {
      logError("resend.track", new Error(error.message), { leadId });
      return false;
    }
    return true;
  } catch (error) {
    logError("resend.track", error, { leadId });
    return false;
  }
}

function readRecipient(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(payload, "to")) return "";
  return (payload as { to?: unknown }).to;
}

function isDeliverableRecipient(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (!email || email.length > 200) return false;
  if (!RECIPIENT_EMAIL.test(email)) return false;
  if (/test\.com/i.test(email)) return false;
  return true;
}

function pitchToHtml(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: Georgia, serif; font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${escaped}</div>`;
}
