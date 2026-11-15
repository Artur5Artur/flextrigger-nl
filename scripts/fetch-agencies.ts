import { config } from "dotenv";
import { resolve } from "node:path";
import { createSupabaseAdminClient } from "../lib/supabase";
import { decodeHtml } from "../lib/text";

config({ path: resolve(process.cwd(), ".env.local") });

type AgencySeed = {
  name: string;
  website: string;
  city: string;
};

const AGENCIES: AgencySeed[] = [
  { name: "24/7 Drive", website: "https://www.247drive.nl/", city: "Son" },
  { name: "E&A Uitzendbureau", website: "https://www.eena.nl/", city: "Tilburg" },
  { name: "Logistics Staffing", website: "https://logisticsstaffing.nl/", city: "Rotterdam" },
  { name: "WerkTalent", website: "https://www.werktalent.com/", city: "Eindhoven" },
];

async function main() {
  const supabase = createSupabaseAdminClient();
  let failed = 0;

  for (const agency of AGENCIES) {
    const check = await fetchTitle(agency.website);
    const confirmed = titleConfirms(check.title, agency.name);
    const { error } = await supabase.from("companies").upsert(
      { name: agency.name, website: agency.website, city: agency.city },
      { onConflict: "name" },
    );

    if (error) {
      failed += 1;
      console.error(`${agency.name} — opslaan mislukt: ${error.message}`);
      continue;
    }

    if (check.ok && confirmed) {
      console.log(`${agency.name} — site bereikbaar (${check.status}), titel bevestigd: ${check.title}. Opgeslagen in ${agency.city}.`);
    } else if (check.ok) {
      console.log(`${agency.name} — site bereikbaar (${check.status}), titel: ${check.title ?? "geen"}. Opgeslagen in ${agency.city}.`);
    } else {
      console.warn(
        `${agency.name} — homepage niet bevestigd (${check.error ?? `status ${check.status}`}). Bekende gegevens alsnog opgeslagen.`,
      );
    }
  }

  if (failed > 0) process.exitCode = 1;
}

async function fetchTitle(url: string): Promise<{ ok: boolean; status: number; title: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "FlexTriggerNL-seed/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    const html = (await response.text()).slice(0, 200_000);
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = match ? decodeHtml(match[1] ?? "").replace(/\s+/g, " ").trim() : null;
    return { ok: response.ok, status: response.status, title };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      title: null,
      error: error instanceof Error ? error.message : "ophalen mislukt",
    };
  }
}

function titleConfirms(title: string | null, name: string): boolean {
  if (!title) return false;
  const haystack = title.toLowerCase();
  const needle = name.toLowerCase();
  if (haystack.includes(needle)) return true;
  const token = needle.split(" ")[0] ?? needle;
  return token.length > 2 && haystack.includes(token);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
