import { isValidEmail } from "@/lib/mailto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadDraft = {
  contact_person: string | null;
  contact_email: string | null;
  ai_pitch: string | null;
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseLeadDraft(body: unknown): { draft: LeadDraft } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Ongeldige invoer." };
  const record = body as Record<string, unknown>;
  const emailRaw = typeof record.contact_email === "string" ? record.contact_email.trim() : "";
  if (emailRaw && !isValidEmail(emailRaw)) return { error: "Vul een geldig e-mailadres in." };
  return {
    draft: {
      contact_person: clip(record.contact_person, 120),
      contact_email: emailRaw ? emailRaw.toLowerCase() : null,
      ai_pitch: clip(record.ai_pitch, 8000),
    },
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
