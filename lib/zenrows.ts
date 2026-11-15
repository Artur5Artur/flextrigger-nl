import { requireEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { findContactEmails } from "@/lib/mailto";

const ZENROWS_ENDPOINT = "https://api.zenrows.com/v1/";

export async function fetchWithZenRows(targetUrl: string): Promise<string> {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    throw new Error("Ongeldige doel-URL.");
  }
  const apiKey = requireEnv("ZENROWS_API_KEY");
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (error) {
    logError("zenrows.fetch", error, { reason: "invalid-url" });
    throw new Error("Ongeldige doel-URL.");
  }
  if (parsedTarget.protocol !== "https:" && parsedTarget.protocol !== "http:") {
    throw new Error(`Ongeldige doel-URL: ${targetUrl}`);
  }

  const endpoint = new URL(ZENROWS_ENDPOINT);
  endpoint.searchParams.set("apikey", apiKey);
  endpoint.searchParams.set("url", parsedTarget.toString());
  endpoint.searchParams.set("js_render", "true");
  endpoint.searchParams.set("antibot", "true");
  endpoint.searchParams.set("premium_proxy", "true");
  endpoint.searchParams.set("proxy_country", "nl");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    logError("zenrows.fetch", error, { host: parsedTarget.hostname });
    throw new Error(`ZenRows niet bereikbaar voor ${parsedTarget.hostname}.`);
  }

  const body = await response.text();
  if (!response.ok) {
    logError("zenrows.fetch", new Error(`HTTP ${response.status}`), { host: parsedTarget.hostname, status: response.status });
    throw new Error(`ZenRows ${response.status} voor ${parsedTarget.hostname}: ${body.slice(0, 280)}`);
  }

  const trimmed = body.trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    throw new Error(`ZenRows gaf geen HTML terug voor ${parsedTarget.hostname}: ${trimmed.slice(0, 280)}`);
  }
  if (trimmed.length < 200) {
    throw new Error(`ZenRows gaf een te korte pagina terug voor ${parsedTarget.hostname}.`);
  }

  const foundEmails = findContactEmails(body);
  console.log("Extracted email:", foundEmails[0] ?? null);

  return body;
}
