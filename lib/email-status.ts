export type EmailTrackingStatus = "sent" | "delivered" | "opened";

const RANK: Record<EmailTrackingStatus, number> = {
  sent: 1,
  delivered: 2,
  opened: 3,
};

export function isEmailTrackingStatus(value: string): value is EmailTrackingStatus {
  return value === "sent" || value === "delivered" || value === "opened";
}

export function emailStatusFromEvent(type: string): EmailTrackingStatus | null {
  if (type === "email.sent") return "sent";
  if (type === "email.delivered") return "delivered";
  if (type === "email.opened") return "opened";
  return null;
}

export function nextEmailStatus(current: string | null, incoming: EmailTrackingStatus): EmailTrackingStatus | null {
  if (!current || !isEmailTrackingStatus(current)) return incoming;
  if (RANK[incoming] <= RANK[current]) return null;
  return incoming;
}

export function emailTrackingLabel(status: string | null): string | null {
  if (status === "sent") return "Verzonden";
  if (status === "delivered") return "Afgeleverd";
  if (status === "opened") return "Gelezen";
  return null;
}

export function leadIdFromTags(tags: unknown): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (!tag || typeof tag !== "object") continue;
      const record = tag as Record<string, unknown>;
      if (record.name === "lead_id" && typeof record.value === "string") return record.value;
    }
    return null;
  }
  if (typeof tags === "object" && "lead_id" in tags) {
    const value = (tags as Record<string, unknown>).lead_id;
    return typeof value === "string" ? value : null;
  }
  return null;
}
