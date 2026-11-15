import { isUuid } from "@/lib/leads";
import { isValidEmail } from "@/lib/mailto";

export type SendEmailInput = {
  to: string;
  subject: string;
  htmlContent: string;
  leadId: string | null;
};

export function parseSendEmailInput(payload: unknown): { input: SendEmailInput } | { error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Ongeldige invoer." };
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.to !== "string" || !record.to.trim()) {
    return { error: "Vul een e-mailadres in." };
  }
  const to = record.to.trim();
  if (!isValidEmail(to)) {
    return { error: "Vul een geldig e-mailadres in." };
  }

  const subject = typeof record.subject === "string" ? record.subject.trim().slice(0, 140) : "";
  const htmlContent = typeof record.htmlContent === "string" ? record.htmlContent.trim().slice(0, 8000) : "";
  if (!subject) return { error: "Onderwerp is verplicht." };
  if (!htmlContent) return { error: "De pitch is leeg." };

  if (record.leadId != null && record.leadId !== "") {
    if (typeof record.leadId !== "string" || !isUuid(record.leadId)) {
      return { error: "Onbekende lead." };
    }
  }

  return {
    input: {
      to,
      subject,
      htmlContent,
      leadId: typeof record.leadId === "string" ? record.leadId : null,
    },
  };
}

export function senderAddress(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>/);
  const email = (match?.[1] ?? trimmed).trim();
  if (!isValidEmail(email) || trimmed.length > 200) return null;
  return trimmed;
}
