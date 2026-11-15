import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaffingIntermediary } from "@/lib/employers";
import { emailForCompany } from "@/lib/mailto";
import { generateAIPitch } from "@/lib/openrouter";
import { parseJobSearchHtml } from "@/lib/parse-jobs";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { SEARCH_TARGETS, type SearchSource } from "@/lib/targets";
import type { ParsedVacancy } from "@/lib/types";
import { logError } from "@/lib/log";
import { fetchWithZenRows } from "@/lib/zenrows";

const MAX_NEW_LEADS = 6;

export type TargetReport = {
  url: string;
  city: string;
  source: SearchSource;
  fetched: boolean;
  extracted: number;
  error: string | null;
};

export type ScanResult = {
  ok: boolean;
  scannedAt: string;
  simulated: boolean;
  targets: TargetReport[];
  createdVacancies: number;
  createdLeads: number;
  skippedExisting: number;
  skippedStaffingAgencies: number;
  errors: string[];
};

type StoreOutcome =
  | { type: "exists" }
  | { type: "created"; vacancyCreated: boolean }
  | { type: "pitch_failed"; vacancyCreated: boolean; message: string };

export async function runMarketScan(options: { demo?: boolean } = {}): Promise<ScanResult> {
  const demo = options.demo === true;
  const result: ScanResult = {
    ok: false,
    scannedAt: new Date().toISOString(),
    simulated: demo,
    targets: [],
    createdVacancies: 0,
    createdLeads: 0,
    skippedExisting: 0,
    skippedStaffingAgencies: 0,
    errors: [],
  };

  try {
    const jobs = demo ? demoVacancies() : await collectLiveJobs(result);
    if (jobs.length === 0) {
      result.ok = result.errors.length === 0 && result.targets.some((target) => target.fetched);
      return result;
    }

    const admin = createSupabaseAdminClient();
    const seen = new Set<string>();
    for (const job of jobs) {
      if (result.createdLeads >= MAX_NEW_LEADS) break;
      if (seen.has(job.sourceUrl)) continue;
      seen.add(job.sourceUrl);
      if (isStaffingIntermediary(job.companyName)) {
        result.skippedStaffingAgencies += 1;
        continue;
      }
      try {
        const outcome = await storeVacancyAndPitch(admin, job, demo);
        if (outcome.type === "exists") result.skippedExisting += 1;
        if (outcome.type === "created") {
          if (outcome.vacancyCreated) result.createdVacancies += 1;
          result.createdLeads += 1;
        }
        if (outcome.type === "pitch_failed") {
          if (outcome.vacancyCreated) result.createdVacancies += 1;
          result.errors.push(outcome.message);
        }
      } catch (error) {
        logError("scan.lead", error, { source: job.sourceUrl.slice(0, 120) });
        result.errors.push(error instanceof Error ? error.message : "Opslaan mislukt.");
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Scan mislukt.");
  }

  const fetched = result.targets.some((target) => target.fetched);
  result.ok = result.createdLeads > 0 || (result.errors.length === 0 && (demo || fetched || result.skippedExisting > 0));
  return result;
}

async function collectLiveJobs(result: ScanResult): Promise<ParsedVacancy[]> {
  const jobs: ParsedVacancy[] = [];
  for (let index = 0; index < SEARCH_TARGETS.length; index += 1) {
    const target = SEARCH_TARGETS[index];
    if (!target) continue;
    if (index > 0) await delay(500);
    const report: TargetReport = {
      url: target.url,
      city: target.city,
      source: target.source,
      fetched: false,
      extracted: 0,
      error: null,
    };
    result.targets.push(report);
    try {
      const html = await fetchWithZenRows(target.url);
      report.fetched = true;
      const parsed = parseJobSearchHtml(html, target.url, target.city);
      for (const job of parsed) {
        if (!job.contactEmail) job.contactEmail = emailForCompany(html, job.companyName);
      }
      report.extracted = parsed.length;
      jobs.push(...parsed);
    } catch (error) {
      logError("zenrows.scan", error, { source: target.source, city: target.city });
      const message = error instanceof Error ? error.message : "Ophalen mislukt.";
      report.error = message;
      result.errors.push(`${target.source} ${target.city}: ${message}`);
    }
  }
  return jobs;
}

async function storeVacancyAndPitch(admin: SupabaseClient, job: ParsedVacancy, demo: boolean): Promise<StoreOutcome> {
  const { data: existing, error: existingError } = await admin
    .from("vacancies")
    .select("id")
    .eq("source_url", job.sourceUrl)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  let vacancyId = existing?.id as string | undefined;
  let vacancyCreated = false;

  if (vacancyId) {
    const { data: lead, error: leadReadError } = await admin
      .from("leads")
      .select("id")
      .eq("vacancy_id", vacancyId)
      .maybeSingle();
    if (leadReadError) throw new Error(leadReadError.message);
    if (lead) return { type: "exists" };
  } else {
    const companyId = await ensureCompany(admin, job);
    const description = (job.description.trim() || `${job.title} bij ${job.companyName} in ${job.location}.`).slice(0, 4000);
    const { data: inserted, error: insertError } = await admin
      .from("vacancies")
      .insert({
        company_id: companyId,
        title: job.title,
        source_url: job.sourceUrl,
        location: job.location,
        raw_description: description,
        status: demo ? "demo" : "new",
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") return { type: "exists" };
      throw new Error(insertError.message);
    }
    vacancyId = inserted.id as string;
    vacancyCreated = true;
  }

  let pitch: string;
  try {
    pitch = await generateAIPitch(job.title, job.companyName, job.city);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pitch mislukt.";
    const { error: leadError } = await admin.from("leads").insert({
      vacancy_id: vacancyId,
      contact_person: "HR-manager",
      contact_email: job.contactEmail,
      ai_pitch: null,
      status: "pitch_failed",
    });
    if (leadError && leadError.code !== "23505") throw new Error(leadError.message);
    return { type: "pitch_failed", vacancyCreated, message: `Pitch voor ${job.companyName} mislukt: ${message}` };
  }

  const { error: leadError } = await admin.from("leads").insert({
    vacancy_id: vacancyId,
    contact_person: "HR-manager",
    contact_email: job.contactEmail,
    ai_pitch: pitch,
    status: "pending",
  });
  if (leadError) {
    if (leadError.code === "23505") return { type: "exists" };
    throw new Error(leadError.message);
  }
  return { type: "created", vacancyCreated };
}

async function ensureCompany(admin: SupabaseClient, job: ParsedVacancy): Promise<string> {
  const name = job.companyName;
  const { data: existing, error: readError } = await admin
    .from("companies")
    .select("id, website")
    .eq("name", name)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    if (!existing.website && job.website) {
      await admin.from("companies").update({ website: job.website }).eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("companies")
    .insert({ name, website: job.website, city: job.city })
    .select("id")
    .single();
  if (!error && data) return data.id as string;

  const { data: raced, error: racedError } = await admin.from("companies").select("id").eq("name", name).maybeSingle();
  if (racedError || !raced) throw new Error(error?.message ?? "Bedrijf opslaan mislukt.");
  return raced.id as string;
}

function demoVacancies(): ParsedVacancy[] {
  return [
    {
      title: "Magazijnmedewerker / reachtruck",
      companyName: "Voorbeeld DC Brabant",
      location: "Tilburg",
      city: "Tilburg",
      sourceUrl: "https://demo.flextrigger.nl/triggers/tilburg-magazijn",
      description:
        "Voorbeeldtrigger voor de pilot. Dit is geen live advertentie. Functie: magazijnmedewerker en reachtruck in Tilburg.",
      contactEmail: null,
      website: null,
    },
    {
      title: "Orderpicker distributiecentrum",
      companyName: "Voorbeeld Fulfilment Eindhoven",
      location: "Eindhoven",
      city: "Eindhoven",
      sourceUrl: "https://demo.flextrigger.nl/triggers/eindhoven-orderpicker",
      description:
        "Voorbeeldtrigger voor de pilot. Dit is geen live advertentie. Functie: orderpicker in een distributiecentrum in Eindhoven.",
      contactEmail: null,
      website: null,
    },
  ];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
