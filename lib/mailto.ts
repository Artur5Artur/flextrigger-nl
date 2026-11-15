const IMAGE_EXT = "png|jpe?g|gif|webp|svg|ico|bmp|avif|tiff?";
const EMAIL_RE = new RegExp(
  `[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.(?!(?:${IMAGE_EXT})\\b)[A-Z]{2,}`,
  "gi",
);
const VALID_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const ASSET_EMAIL = new RegExp(`@(?:\\d+x\\.)|(?:\\.(?:${IMAGE_EXT}))$`, "i");
const SYSTEM_LOCAL =
  /(?:^|[-_.])(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|geen[-_.]?reply|niet[-_.]?beantwoorden|mailer-daemon|postmaster|bounces?|webmaster|hostmaster|newsletter|notifications?|daemon)(?:$|[-_.])|^(?:example|test|username|your[-_.]?name|your[-_.]?email|someone|somebody|naam)$/i;
const SYSTEM_DOMAIN =
  /(?:^|\.)(?:w3\.org|example\.(?:com|org|net)|domain\.com|test\.com|schema\.org|sentry\.io|wixpress\.com|cloudflare\.com|gravatar\.com|gstatic\.com)$/i;
const BLOCKED_HOST = /indeed\.|stepstone\.|sentry\.|example\.com|schema\.org|wixpress|cloudflare/i;
const HR_LOCAL =
  /^(?:hr|human[-_.]?resources|recruit(?:er|ment|ing)?|vacatures?|sollicit(?:atie|eren)|personeelszaken|personeel|careers?|jobs?|hiring|talent(?:acquisition)?|werkenbij|people(?:team)?)$/i;

export function isValidEmail(value: string): boolean {
  return VALID_EMAIL.test(value.trim()) && value.trim().length <= 200;
}

export function findContactEmails(text: string): string[] {
  return listEmails(text);
}

export function pickEmail(text: string): string | null {
  return listEmails(text)[0] ?? null;
}

export function emailForCompany(html: string, companyName: string): string | null {
  const needle = companyName.trim().toLowerCase();
  if (needle.length < 2) return null;
  const haystack = html.toLowerCase();
  let from = 0;
  while (from < haystack.length) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    const windowText = html.slice(Math.max(0, at - 120), Math.min(html.length, at + needle.length + 400));
    const email = pickEmail(windowText);
    if (email) return email;
    from = at + needle.length;
  }
  return listEmails(html).find((email) => domainMatchesCompany(email, companyName)) ?? null;
}

function listEmails(text: string): string[] {
  const matches = text.match(new RegExp(EMAIL_RE.source, "gi")) ?? [];
  const unique: string[] = [];
  for (const candidate of matches) {
    const email = candidate.toLowerCase();
    if (!isRecruitingContact(email) || unique.includes(email)) continue;
    unique.push(email);
  }
  unique.sort((left, right) => contactRank(left) - contactRank(right));
  return unique;
}

function isRecruitingContact(email: string): boolean {
  if (!isValidEmail(email) || ASSET_EMAIL.test(email)) return false;
  const [localPart, domain = ""] = email.split("@");
  const local = localPart?.split("+")[0] ?? "";
  if (!local || SYSTEM_LOCAL.test(local) || SYSTEM_DOMAIN.test(domain) || BLOCKED_HOST.test(email)) return false;
  return true;
}

function contactRank(email: string): number {
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  if (HR_LOCAL.test(local)) return 0;
  if (/(hr|recruit|vacature|sollicit|personeel|career|hiring)/i.test(local)) return 1;
  return 2;
}

function domainMatchesCompany(email: string, companyName: string): boolean {
  const label = (email.split("@")[1] ?? "").split(".")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (label.length < 5 || slug.length < 5) return false;
  return slug.includes(label) || label.includes(slug);
}

export function splitPitch(pitch: string): { subject: string; body: string } {
  const match = pitch.match(/^\s*Onderwerp:\s*(.+)\s*$/m);
  const subject = (match?.[1] ?? "Logistiek personeel voor uw openstaande vacature").trim().slice(0, 140);
  const body = pitch.replace(/^\s*Onderwerp:\s*.+(?:\r?\n)+/, "").trim().slice(0, 3500);
  return { subject, body: body || pitch.trim().slice(0, 3500) };
}

export function buildMailto(email: string, pitch: string): string {
  const recipient = email.trim();
  if (!isValidEmail(recipient)) {
    throw new Error("Ongeldig e-mailadres.");
  }
  const { subject, body } = splitPitch(pitch);
  const params = new URLSearchParams({ subject, body });
  return `mailto:${recipient}?${params.toString()}`;
}
