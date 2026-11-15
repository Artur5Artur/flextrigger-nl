export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function sourceLabel(url: string): string {
  if (url.includes("indeed.")) return "Indeed";
  if (url.includes("stepstone.")) return "StepStone";
  if (url.includes("demo.flextrigger.nl")) return "Voorbeeld";
  return "Bron";
}

export function leadStatusLabel(status: string): string {
  if (status === "sent") return "Verstuurd";
  if (status === "pitch_failed") return "Pitch mislukt";
  return "Klaar om te sturen";
}
