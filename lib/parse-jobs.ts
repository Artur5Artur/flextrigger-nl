import type { ParsedVacancy } from "@/lib/types";
import { cleanText, htmlToText } from "@/lib/text";
import { pickEmail } from "@/lib/mailto";

const CITY_NAMES = [
  "Tilburg",
  "Eindhoven",
  "Waalwijk",
  "Oss",
  "Breda",
  "'s-Hertogenbosch",
  "Den Bosch",
  "Helmond",
  "Son",
  "Veldhoven",
  "Best",
  "Oosterhout",
  "Roosendaal",
  "Bergen op Zoom",
  "Uden",
  "Veghel",
  "Boxtel",
  "Rotterdam",
];

const BLOCKED_TITLES = /^(vacatures|jobs|filters|opslaan|solliciteer|indeed|stepstone)$/i;

export function parseJobSearchHtml(html: string, pageUrl: string, fallbackCity: string): ParsedVacancy[] {
  const source = html.slice(0, 2_000_000);
  const jobs = [
    ...parseJsonLdJobs(source, pageUrl, fallbackCity),
    ...parseIndeedJobs(source, pageUrl, fallbackCity),
    ...parseStepstoneJobs(source, pageUrl, fallbackCity),
  ];
  return dedupe(jobs).slice(0, 15);
}

export function cityFromLocation(location: string, fallback: string): string {
  const haystack = location.toLowerCase();
  const found = CITY_NAMES.find((city) => haystack.includes(city.toLowerCase()));
  return found ?? fallback;
}

function parseJsonLdJobs(html: string, pageUrl: string, fallbackCity: string): ParsedVacancy[] {
  const jobs: ParsedVacancy[] = [];
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    for (const block of parseJsonLdBlock(script[1] ?? "")) {
      walk(block, (node) => {
        if (!isJobPosting(node)) return;
        const job = jobFromJsonLd(node, pageUrl, fallbackCity);
        if (job) jobs.push(job);
      });
    }
  }
  return jobs;
}

function parseJsonLdBlock(raw: string): unknown[] {
  const candidates = [raw.trim(), decodeForJson(raw)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      continue;
    }
  }
  return [];
}

function decodeForJson(raw: string): string {
  return raw
    .trim()
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'");
}

function walk(node: unknown, visit: (record: Record<string, unknown>) => void, depth = 0): void {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  visit(record);
  for (const key of ["@graph", "itemListElement", "item", "mainEntity", "about", "hasPart"]) {
    if (key in record) walk(record[key], visit, depth + 1);
  }
}

function isJobPosting(node: Record<string, unknown>): boolean {
  const raw = node["@type"];
  const types = Array.isArray(raw) ? raw : [raw];
  return types.some((type) => typeof type === "string" && /jobposting/i.test(type));
}

function jobFromJsonLd(node: Record<string, unknown>, pageUrl: string, fallbackCity: string): ParsedVacancy | null {
  const title = cleanTitle(typeof node.title === "string" ? node.title : "");
  const companyName = organizationName(node.hiringOrganization);
  const sourceUrl = canonicalSourceUrl(firstUrl(node.url) ?? firstUrl(node.sameAs) ?? "", pageUrl);
  if (!title || !companyName || !sourceUrl) return null;

  const location = cleanText(locality(node.jobLocation)) || fallbackCity;
  const description = htmlToText(typeof node.description === "string" ? node.description : "").slice(0, 4000);
  const organizationEmail =
    node.hiringOrganization && typeof node.hiringOrganization === "object"
      ? firstUrl((node.hiringOrganization as Record<string, unknown>).email)
      : null;
  const contactEmail = pickEmail(`${organizationEmail ?? ""}\n${description}`);
  const website = usableWebsite(organizationWebsite(node.hiringOrganization));

  return {
    title,
    companyName,
    location: location.slice(0, 180),
    city: cityFromLocation(location, fallbackCity),
    sourceUrl,
    description,
    contactEmail,
    website,
  };
}

function parseIndeedJobs(html: string, _pageUrl: string, fallbackCity: string): ParsedVacancy[] {
  const matches = [...html.matchAll(/data-jk="([a-f0-9]{8,})"/gi)];
  const jobs: ParsedVacancy[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const jk = match?.[1];
    if (!jk || seen.has(jk)) continue;
    seen.add(jk);
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? Math.min(html.length, start + 4000);
    const slice = html.slice(start, end);
    const title = cleanTitle(
      attr(slice, /<a[^>]*class="[^"]*jcs-JobTitle[^"]*"[^>]*aria-label="([^"]+)"/i) ||
        attr(slice, /aria-label="([^"]+)"/i) ||
        attr(slice, /<span[^>]*id="jobTitle[^"]*"[^>]*title="([^"]+)"/i) ||
        text(slice, /jobTitle[^>]*>([\s\S]{0,220}?)<\//i),
    );
    const companyName = cleanCompany(
      text(slice, /data-testid="company-name"[^>]*>([\s\S]*?)<\//i) ||
        text(slice, /class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\//i),
    );
    if (!title || !companyName) continue;
    const location =
      cleanText(
        text(slice, /data-testid="text-location"[^>]*>([\s\S]*?)<\//i) ||
          text(slice, /class="[^"]*companyLocation[^"]*"[^>]*>([\s\S]*?)<\//i),
      ) || fallbackCity;
    jobs.push({
      title,
      companyName,
      location: location.slice(0, 180),
      city: cityFromLocation(location, fallbackCity),
      sourceUrl: `https://nl.indeed.com/viewjob?jk=${jk}`,
      description: `${title} bij ${companyName} in ${location}.`,
      contactEmail: pickEmail(slice),
      website: null,
    });
    if (jobs.length >= 12) break;
  }

  return jobs;
}

function parseStepstoneJobs(html: string, pageUrl: string, fallbackCity: string): ParsedVacancy[] {
  const matches = [...html.matchAll(/href="((?:https?:\/\/(?:www\.)?stepstone\.nl)?\/vacatures?\/[^"#?\s]{8,})"/gi)];
  const jobs: ParsedVacancy[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const href = match?.[1];
    if (!href) continue;
    const absolute = canonicalSourceUrl(href, pageUrl);
    if (!absolute || !isStepstoneJobUrl(absolute) || seen.has(absolute)) continue;
    seen.add(absolute);
    const hrefAt = match.index ?? 0;
    const start = elementStart(html, hrefAt);
    const end = matches[index + 1]?.index ?? Math.min(html.length, hrefAt + 1800);
    const slice = html.slice(start, end);
    const title = cleanTitle(
      text(slice, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
        attr(slice, /aria-label="([^"]+)"/i) ||
        text(slice, /<a[^>]*>([\s\S]*?)<\/a>/i),
    );
    const companyName = cleanCompany(
      text(slice, /data-at="job-item-company-name"[^>]*>([\s\S]*?)<\//i) ||
        text(slice, /data-testid="job-item-company-name"[^>]*>([\s\S]*?)<\//i),
    );
    if (!title || !companyName) continue;
    const location =
      cleanText(text(slice, /data-at="job-item-location"[^>]*>([\s\S]*?)<\//i) || text(slice, /data-testid="job-item-location"[^>]*>([\s\S]*?)<\//i)) ||
      fallbackCity;
    jobs.push({
      title,
      companyName,
      location: location.slice(0, 180),
      city: cityFromLocation(location, fallbackCity),
      sourceUrl: absolute,
      description: `${title} bij ${companyName} in ${location}.`,
      contactEmail: pickEmail(slice),
      website: null,
    });
    if (jobs.length >= 12) break;
  }

  return jobs;
}

function isStepstoneJobUrl(url: string): boolean {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "vacatures" && parts[0] !== "vacature") return false;
  if (parts.some((part) => part === "in" || part.startsWith("in-"))) return false;
  const slug = parts[parts.length - 1] ?? "";
  if (/\d{5,}/.test(slug)) return true;
  return slug.length > 24 && slug.includes("-");
}

function organizationName(value: unknown): string {
  if (typeof value === "string") return cleanCompany(value);
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return cleanCompany(name);
  }
  return "";
}

function organizationWebsite(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return firstUrl(record.sameAs) ?? firstUrl(record.url);
}

function locality(value: unknown): string {
  const locations = Array.isArray(value) ? value : [value];
  for (const location of locations) {
    if (!location || typeof location !== "object") continue;
    const address = (location as { address?: unknown }).address;
    if (typeof address === "string") return address;
    if (address && typeof address === "object") {
      const record = address as { addressLocality?: unknown; addressRegion?: unknown };
      if (typeof record.addressLocality === "string") return record.addressLocality;
      if (typeof record.addressRegion === "string") return record.addressRegion;
    }
  }
  return "";
}

function firstUrl(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && item.trim());
    return typeof found === "string" ? found.trim() : null;
  }
  return null;
}

function usableWebsite(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (/(indeed\.|stepstone\.|google\.|schema\.org)/.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalSourceUrl(href: string, pageUrl: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    const jk = url.searchParams.get("jk");
    if (url.hostname.endsWith("indeed.com") && jk && /^[a-f0-9]{8,}$/i.test(jk)) {
      return `https://nl.indeed.com/viewjob?jk=${jk.toLowerCase()}`;
    }
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "from" || key === "alid" || key === "xkcb") {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function cleanTitle(value: string | null): string {
  const title = cleanText(value)
    .replace(/^full details of\s+/i, "")
    .replace(/^volledige details van\s+/i, "")
    .replace(/\s+[|–-]\s+indeed.*$/i, "");
  if (title.length < 3 || title.length > 180) return "";
  if (BLOCKED_TITLES.test(title)) return "";
  return title;
}

function cleanCompany(value: string | null): string {
  const name = cleanText(value)
    .replace(/\s+[|–-]\s+indeed.*$/i, "")
    .replace(/\s+via\s+(indeed|stepstone).*$/i, "");
  if (name.length < 2 || name.length > 160) return "";
  if (/^(indeed|stepstone|confidential|vertrouwelijk|onbekend)$/i.test(name)) return "";
  return name;
}

function elementStart(html: string, index: number): number {
  const from = Math.max(0, index - 400);
  const relative = html.slice(from, index).lastIndexOf("<a");
  if (relative === -1) return index;
  return from + relative;
}

function attr(slice: string, pattern: RegExp): string | null {
  return pattern.exec(slice)?.[1] ?? null;
}

function text(slice: string, pattern: RegExp): string | null {
  return pattern.exec(slice)?.[1] ?? null;
}

function dedupe(jobs: ParsedVacancy[]): ParsedVacancy[] {
  const seen = new Set<string>();
  const unique: ParsedVacancy[] = [];
  for (const job of jobs) {
    if (seen.has(job.sourceUrl)) continue;
    seen.add(job.sourceUrl);
    unique.push(job);
  }
  return unique;
}
