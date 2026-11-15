import { requireEnv, siteUrl } from "@/lib/env";
import { logError } from "@/lib/log";

export const PITCH_SYSTEM_PROMPT = `Je bent een senior B2B-tekstschrijver voor Nederlandse uitzendbureaus in logistiek en warehousing. Je schrijft een koude acquisitiemail aan de HR-manager of operationeel leidinggevende die zojuist een vacature in magazijn, distributie of warehousing heeft geopend.

Verplichte taal: het hele antwoord is professioneel zakelijk Nederlands. De aanspreking is beleefd, met "u" en "uw". "je", "jij", "jou", "jouw" en "jullie" zijn verboden, ook in de onderwerpregel.

Schrijf in vloeiend, natuurlijk Nederlands zoals dat in Nederland wordt gebruikt. Kort, concreet en actiegericht. De lezer is druk en slaat brochuretaal over.

Tone of Voice:
Write the outreach pitch in professional, polite Dutch. Use formal language ('u' instead of 'je'). Keep it concise, focused on how our logistics/packaging workforce solutions can immediately solve their staffing shortage. Structure it with a strong subject line, a direct opening referencing their specific vacancy, and a clear call to action.

Regels:
- Gebruik altijd "u" en "uw". Nooit "je", "jij", "jou", "jouw" of "jullie".
- Maximaal 130 woorden in de mailtekst, exclusief de onderwerpregel.
- Begin met exact één regel in de vorm "Onderwerp: ..." van maximaal 55 tekens. Geen clickbait en geen schreeuwerige hoofdletters.
- Spreek aan met "Beste heer/mevrouw,". Verzin geen persoonsnaam.
- Noem de functietitel, het bedrijf en de plaats. Koppel daar één observatie aan: deze functie staat nu open, dus de werkvloer heeft op korte termijn capaciteit nodig.
- Bied alleen aan wat een logistiek uitzendbureau echt kan doen: direct inzetbare magazijn- en logistiekmedewerkers voor orderpicken, inpakken, laden en lossen, en heftruck of reachtruck wanneer de functietitel daarom vraagt.
- Eén call-to-action: een gesprek van 15 minuten deze week. Stel één vraag.
- Verzin geen cijfers, klantnamen, tarieven, doorlooptijden of gemeenschappelijke contacten. Geen loze superlatieven en geen onechte urgentie.
- Liever lopende zinnen dan een lange lijst. Geen opsomming van meer dan drie bullets.
- Zeg niet dat je een AI of FlexTrigger bent. De mail komt van het uitzendbureau.
- Geen emoji's, geen HTML en geen markdown.
- Sluit exact zo af:

Met vriendelijke groet,
[Naam]
[Uitzendbureau]
[Telefoonnummer]

Dit is een concept. De recruiter past de afsluiting aan en verstuurt de mail zelf.`;

const PRIMARY_MODEL = "anthropic/claude-3.5-sonnet";
const FALLBACK_MODEL = "anthropic/claude-sonnet-5.5";

type ChatPayload = {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string };
};

export async function generateAIPitch(vacancyTitle: string, companyName: string, city: string): Promise<string> {
  const title = field(vacancyTitle, 180);
  const company = field(companyName, 160);
  const place = field(city, 80);
  if (!title || !company || !place) {
    throw new Error("Functie, bedrijf en plaats zijn nodig voor een pitch.");
  }

  const apiKey = requireEnv("OPENROUTER_API_KEY");
  const preferred = process.env.OPENROUTER_MODEL?.trim() || PRIMARY_MODEL;
  const models = preferred === FALLBACK_MODEL ? [preferred] : [preferred, FALLBACK_MODEL];
  let lastError = "OpenRouter gaf geen pitch terug.";

  for (const model of models) {
    try {
      const first = await requestPitch(apiKey, model, title, company, place, false);
      if (usablePitch(first)) return first;
      const second = await requestPitch(apiKey, model, title, company, place, true);
      if (second.trim()) return second.trim();
      lastError = "Het model leverde een lege pitch.";
    } catch (error) {
      logError("openrouter.pitch", error, { model });
      lastError = error instanceof Error ? error.message : lastError;
      const retryable = /lege reactie|lege pitch|no endpoints found|model .* not found|404|429|502|503|niet bereikbaar/i.test(lastError);
      if (!retryable) break;
    }
  }

  throw new Error(lastError);
}

async function requestPitch(
  apiKey: string,
  model: string,
  title: string,
  company: string,
  place: string,
  forceDutch: boolean,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl().toString(),
        "X-Title": "FlexTrigger NL",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 4000,
        ...(needsReasoningBudget(model) ? { reasoning: { max_tokens: 500 } } : {}),
        messages: [
          { role: "system", content: PITCH_SYSTEM_PROMPT },
          { role: "user", content: userContent(title, company, place, forceDutch) },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    logError("openrouter.fetch", error, { model });
    throw new Error(`OpenRouter niet bereikbaar (${model}).`);
  }

  const payload = (await response.json().catch(() => null)) as ChatPayload | null;
  if (!response.ok) {
    const message = payload?.error?.message || response.statusText || "onbekende fout";
    throw new Error(`OpenRouter ${response.status} (${model}): ${message}`);
  }

  const text = readContent(payload).trim();
  if (!text) {
    throw new Error(`OpenRouter gaf een lege reactie (${model}).`);
  }
  return text;
}

function needsReasoningBudget(model: string): boolean {
  return /claude-(sonnet|opus)-[45]|sonnet-5|opus-4/i.test(model);
}

function userContent(title: string, company: string, place: string, forceDutch: boolean): string {
  const lines = [
    "Schrijf de acquisitiemail voor deze zojuist gesignaleerde vacature.",
    `Functie: ${title}`,
    `Bedrijf: ${company}`,
    `Plaats: ${place}`,
    "Sector: logistiek en warehousing.",
    "Toon: professioneel en beleefd. Gebruik 'u' en 'uw', nooit 'je', 'jij' of 'jullie'.",
  ];
  if (forceDutch) {
    lines.push("De vorige versie was niet bruikbaar. Schrijf uitsluitend in formeel Nederlands, met 'u' en 'uw'.");
  }
  return lines.join("\n");
}

function readContent(payload: ChatPayload | null): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n");
  }
  return "";
}

function usablePitch(text: string): boolean {
  return looksDutch(text) && !/\b(je|jij|jou|jouw|jullie)\b/i.test(text);
}

function looksDutch(text: string): boolean {
  const hits = text.match(/\b(je|jij|u|wij|we|vacature|magazijn|groet|beste|deze|voor|een|het|niet|jullie)\b/gi);
  return (hits?.length ?? 0) >= 4;
}

function field(value: string, max: number): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
