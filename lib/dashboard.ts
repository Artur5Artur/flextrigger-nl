import { isEmailTrackingStatus } from "@/lib/email-status";
import { logError } from "@/lib/log";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { CompanyRecord, DashboardLead, PilotRequest } from "@/lib/types";

const LEAD_COLUMNS = `
        id, contact_person, contact_email, ai_pitch, status, email_status, created_at,
        vacancy:vacancies (
          id, title, source_url, location, status,
          company:companies ( name, city, website )
        )
      `;

const LEGACY_LEAD_COLUMNS = `
        id, contact_person, contact_email, ai_pitch, status, created_at,
        vacancy:vacancies (
          id, title, source_url, location, status,
          company:companies ( name, city, website )
        )
      `;

export async function loadDashboard(): Promise<{
  leads: DashboardLead[];
  companies: CompanyRecord[];
  pilotRequests: PilotRequest[];
}> {
  const supabase = createSupabaseAdminClient();
  const [leadsResult, companiesResult, pilotsResult] = await Promise.all([
    loadLeadRows(supabase),
    supabase.from("companies").select("id, name, website, city, created_at").order("name", { ascending: true }).limit(200),
    supabase
      .from("pilot_requests")
      .select("id, agency_name, contact_name, email, city, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (companiesResult.error) throw new Error(companiesResult.error.message);

  return {
    leads: safeRows(leadsResult.data, normalizeLead, "dashboard.lead").filter((lead) => lead.id),
    companies: safeRows(companiesResult.data, normalizeCompany, "dashboard.company").filter((company) => company.id),
    pilotRequests: pilotsResult.error ? [] : safeRows(pilotsResult.data, normalizePilot, "dashboard.pilot").filter((request) => request.id),
  };
}

function safeRows<T>(rows: unknown[] | null, normalize: (row: unknown) => T, scope: string): T[] {
  const safe: T[] = [];
  for (const row of rows ?? []) {
    try {
      safe.push(normalize(row));
    } catch (error) {
      logError(scope, error);
    }
  }
  return safe;
}

function normalizeLead(row: unknown): DashboardLead {
  const record = asRecord(row);
  const vacancy = one(record.vacancy);
  const company = vacancy ? one(asRecord(vacancy).company) : null;
  const companyRecord = company ? asRecord(company) : null;
  return {
    id: String(record.id ?? ""),
    contact_person: asNullableString(record.contact_person),
    contact_email: asNullableString(record.contact_email),
    ai_pitch: asNullableString(record.ai_pitch),
    status: String(record.status ?? "pending"),
    email_status: isEmailTrackingStatus(String(record.email_status ?? ""))
      ? (record.email_status as DashboardLead["email_status"])
      : null,
    created_at: String(record.created_at ?? ""),
    vacancy: vacancy
      ? {
          id: String(asRecord(vacancy).id ?? ""),
          title: String(asRecord(vacancy).title ?? ""),
          source_url: String(asRecord(vacancy).source_url ?? ""),
          location: asNullableString(asRecord(vacancy).location),
          status: String(asRecord(vacancy).status ?? "new"),
          company: companyRecord
            ? {
                name: String(companyRecord.name ?? ""),
                city: asNullableString(companyRecord.city),
                website: asNullableString(companyRecord.website),
              }
            : null,
        }
      : null,
  };
}

function normalizePilot(row: unknown): PilotRequest {
  const record = asRecord(row);
  return {
    id: String(record.id ?? ""),
    agency_name: String(record.agency_name ?? ""),
    contact_name: String(record.contact_name ?? ""),
    email: String(record.email ?? ""),
    city: asNullableString(record.city),
    created_at: String(record.created_at ?? ""),
  };
}

function normalizeCompany(row: unknown): CompanyRecord {
  const record = asRecord(row);
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? ""),
    website: asNullableString(record.website),
    city: asNullableString(record.city),
    created_at: String(record.created_at ?? ""),
  };
}

async function loadLeadRows(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const extended = await supabase.from("leads").select(LEAD_COLUMNS).order("created_at", { ascending: false }).limit(100);
  if (!extended.error) return extended;
  if (!/email_status|schema cache|column/i.test(extended.error.message)) return extended;
  return supabase.from("leads").select(LEGACY_LEAD_COLUMNS).order("created_at", { ascending: false }).limit(100);
}

function one(value: unknown): unknown {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
