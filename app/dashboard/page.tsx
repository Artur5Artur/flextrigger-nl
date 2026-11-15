"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { scanDemo, scanMarket } from "@/app/dashboard/actions";
import { emailTrackingLabel, isEmailTrackingStatus, nextEmailStatus, type EmailTrackingStatus } from "@/lib/email-status";
import { formatWhen, leadStatusLabel, sourceLabel } from "@/lib/format";
import { buildMailto, isValidEmail, splitPitch } from "@/lib/mailto";
import { PREVIEW_COMPANIES, PREVIEW_LEADS } from "@/lib/preview";
import type { DashboardLead, DashboardPayload } from "@/lib/types";

const inputClass = "w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none";
const primaryBtn = "bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50";
const sendBtnReady = "bg-pine px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-60";
const sendBtnMuted = "cursor-not-allowed bg-sand px-4 py-2.5 text-sm font-semibold text-ink/40";
const ghostBtn = "border border-line bg-white px-4 py-2.5 text-sm disabled:opacity-50";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const pilotJustSent = searchParams.get("pilot") === "1";
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [scanState, setScanState] = useState<"idle" | "live" | "demo" | "done" | "error">("idle");
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preview) {
      setPayload({ configured: false, leads: PREVIEW_LEADS, companies: PREVIEW_COMPANIES, pilotRequests: [] });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    if (reloadToken === 0) setLoading(true);
    fetch("/api/dashboard", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await readResponse<DashboardPayload>(response);
        if (!body) {
          setPayload({
            configured: true,
            leads: [],
            companies: [],
            error: "Het dashboard gaf een ongeldig antwoord.",
          });
          return;
        }
        if (!response.ok && !body.error) body.error = "Dashboard laden mislukt.";
        setPayload(body);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPayload({ configured: true, leads: [], companies: [], error: "Geen verbinding met het dashboard." });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [preview, reloadToken]);

  useEffect(() => {
    if (preview) return;
    const waiting = (payload?.leads ?? []).some(
      (lead) => lead.email_status === "sent" || lead.email_status === "delivered",
    );
    if (!waiting) return;
    const timer = window.setInterval(() => setReloadToken((value) => value + 1), 20_000);
    return () => window.clearInterval(timer);
  }, [preview, payload]);

  function replaceLead(next: DashboardLead) {
    setPayload((current) => {
      if (!current) return current;
      return { ...current, leads: current.leads.map((lead) => (lead.id === next.id ? next : lead)) };
    });
  }

  async function runScan(kind: "live" | "demo") {
    setScanState(kind);
    setScanMessage(null);
    try {
      const result = kind === "live" ? await scanMarket() : await scanDemo();
      const summary = [
        result.createdLeads > 0
          ? `${result.createdLeads} nieuwe ${result.createdLeads === 1 ? "pitch" : "pitches"} opgeslagen.`
          : "Geen nieuwe vacatures. Bestaande triggers blijven staan.",
        result.errors[0] ?? null,
      ]
        .filter(Boolean)
        .join(" ");
      setScanState(result.ok || result.createdLeads > 0 ? "done" : "error");
      setScanMessage(summary);
      setReloadToken((value) => value + 1);
    } catch (error) {
      setScanState("error");
      setScanMessage(error instanceof Error ? error.message : "Scan mislukt.");
    }
  }

  const leads = payload?.leads ?? [];
  const companies = payload?.companies ?? [];
  const pilotRequests = payload?.pilotRequests ?? [];
  const pending = leads.filter((lead) => lead.status === "pending").length;
  const sent = leads.filter((lead) => lead.status === "sent").length;
  const failed = leads.filter((lead) => lead.status === "pitch_failed").length;

  return (
    <main id="inhoud" className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Recruiterdashboard</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Hot triggers</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/70">
            Nieuwe logistieke vacatures, de plaats, en de Nederlandse pitch die je vandaag kunt sturen.
          </p>
        </div>
        {payload?.configured && !preview ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} disabled={scanState === "live" || scanState === "demo"} onClick={() => runScan("live")}>
              {scanState === "live" ? "Markt scannen…" : "Scan Indeed en StepStone"}
            </button>
            <button type="button" className={ghostBtn} disabled={scanState === "live" || scanState === "demo"} onClick={() => runScan("demo")}>
              {scanState === "demo" ? "Voorbeelden laden…" : "Laad voorbeeldtriggers"}
            </button>
          </div>
        ) : null}
      </div>

      {scanMessage ? (
        <p role="status" className={`mt-4 text-sm ${scanState === "error" ? "text-signal" : "text-pine"}`}>
          {scanMessage}
        </p>
      ) : null}

      {preview ? (
        <p className="mt-4 border border-line bg-white px-4 py-3 text-sm">
          Voorbeeldweergave. Deze triggers zijn niet opgeslagen en komen niet van Indeed of StepStone.
        </p>
      ) : null}

      {pilotJustSent && !preview ? (
        <p className="mt-4 border border-line bg-white px-4 py-3 text-sm text-pine" role="status">
          Aanvraag binnen. Het bureau staat hieronder. Pitches verschijnen nadat Indeed en StepStone zijn gescand.
        </p>
      ) : null}

      {loading ? <p className="mt-10 text-sm text-ink/70">Triggers laden…</p> : null}

      {!loading && payload && !payload.configured && !preview ? <SetupPanel /> : null}

      {!loading && payload?.error ? (
        <p className="mt-6 border border-signal/30 bg-white px-4 py-3 text-sm text-signal" role="alert">
          {payload.error} Voer <span className="font-semibold">database/schema.sql</span> uit in de Supabase SQL-editor
          als de tabellen nog ontbreken.
        </p>
      ) : null}

      {!loading && payload && (payload.configured || preview) && !payload.error ? (
        <>
          {pilotRequests.length > 0 ? (
            <section className="mt-8 border border-line bg-white">
              <h2 className="px-4 py-3 font-serif text-2xl">Pilotaanvragen</h2>
              <ul>
                {pilotRequests.map((request) => (
                  <li key={request.id} className="border-t border-line px-4 py-3 text-sm">
                    <span className="font-semibold">{request.agency_name}</span>
                    {` · ${request.contact_name} · ${request.email}`}
                    {request.city ? ` · ${request.city}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Triggers" value={String(leads.length)} />
            <Stat label="Klaar om te sturen" value={String(pending)} />
            <Stat label="Verstuurd" value={String(sent)} />
            <Stat label="Pitch mislukt" value={String(failed)} />
          </dl>

          <div className="mt-8 grid gap-5">
            {leads.length === 0 ? (
              <div className="border border-dashed border-line bg-white px-5 py-10 text-sm text-ink/75">
                Nog geen triggers. Scan Indeed en StepStone, of laad voorbeeldtriggers om de pitch-pijplijn te testen
                zonder live vacatures.
              </div>
            ) : (
              leads.map((lead) =>
                lead?.id ? (
                  <LeadCardBoundary key={lead.id} leadId={lead.id}>
                    <LeadCard lead={lead} preview={preview} onChanged={replaceLead} />
                  </LeadCardBoundary>
                ) : null,
              )
            )}
          </div>

          <details className="mt-10 border border-line bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              Bedrijven in de database ({companies.length})
            </summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-left text-sm">
                <thead className="text-ink/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Naam</th>
                    <th className="px-4 py-2 font-medium">Plaats</th>
                    <th className="px-4 py-2 font-medium">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-t border-line">
                      <td className="px-4 py-2">{company.name}</td>
                      <td className="px-4 py-2">{company.city ?? "—"}</td>
                      <td className="px-4 py-2">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noreferrer noopener" className="underline">
                            {company.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : null}
    </main>
  );
}

function SetupPanel() {
  return (
    <section className="mt-8 border border-line bg-white p-5">
      <h2 className="font-serif text-2xl">Supabase is nog niet gekoppeld</h2>
      <ol className="mt-4 grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-ink/80">
        <li>Kopieer .env.local.example naar .env.local en vul de Supabase-sleutels in.</li>
        <li>Voer database/schema.sql uit in de Supabase SQL-editor.</li>
        <li>Zaai de bureaus met npm run seed:agencies.</li>
        <li>Draai een scan met npm run scan, of vanuit dit dashboard zodra de sleutels erin staan.</li>
      </ol>
      <a href="/dashboard?preview=1" className="mt-5 inline-block bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
        Bekijk een voorbeeld
      </a>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.14em] text-ink/50">{label}</dt>
      <dd className="mt-1 font-serif text-3xl">{value}</dd>
    </div>
  );
}

class LeadCardBoundary extends Component<{ leadId: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("[flextrigger] dashboard.card", { leadId: this.props.leadId, error });
  }

  render() {
    if (this.state.failed) {
      return (
        <article className="border border-line bg-white p-5 text-sm text-ink/80">
          Deze trigger kon niet worden getoond. De andere kaarten blijven beschikbaar.
        </article>
      );
    }
    return this.props.children;
  }
}

function LeadCard({
  lead,
  preview,
  onChanged,
}: {
  lead: DashboardLead;
  preview: boolean;
  onChanged: (lead: DashboardLead) => void;
}) {
  const [person, setPerson] = useState(contactOrFallback(lead.contact_person));
  const [email, setEmail] = useState(textOrEmpty(lead.contact_email));
  const [pitch, setPitch] = useState(textOrEmpty(lead.ai_pitch));
  const [status, setStatus] = useState(lead.status);
  const [emailStatus, setEmailStatus] = useState<DashboardLead["email_status"]>(lead.email_status);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "copy" | "send" | "resend" | "regenerate" | null>(null);
  const sendingRef = useRef(false);
  const pitchAlreadySent =
    status === "sent" || emailStatus === "sent" || emailStatus === "delivered" || emailStatus === "opened";
  const sentLock = useRef(pitchAlreadySent);

  useEffect(() => {
    sentLock.current = pitchAlreadySent;
  }, [pitchAlreadySent]);
  const company = lead.vacancy?.company?.name ?? "Onbekend bedrijf";
  const city = lead.vacancy?.company?.city ?? lead.vacancy?.location ?? "Onbekende plaats";
  const sourceUrl = lead.vacancy?.source_url ?? "";
  const demoSource = sourceUrl.includes("demo.flextrigger.nl") || lead.vacancy?.status === "demo";

  useEffect(() => {
    setPerson(contactOrFallback(lead.contact_person));
    setEmail(textOrEmpty(lead.contact_email));
    setPitch(textOrEmpty(lead.ai_pitch));
    setStatus(lead.status);
    setEmailStatus((current): DashboardLead["email_status"] => forwardEmailStatus(current, lead.email_status));
  }, [lead.id, lead.contact_person, lead.contact_email, lead.ai_pitch, lead.status, lead.email_status]);

  async function save() {
    if (preview) {
      setFeedback("Voorbeeldweergave: wijzigingen worden niet opgeslagen.");
      return;
    }
    setBusy("save");
    setFeedback(null);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_person: person, contact_email: email, ai_pitch: pitch }),
      });
      const body = await readResponse<{ ok?: boolean; error?: string }>(response);
      if (!body) {
        setFeedback("De server gaf een ongeldig antwoord.");
        return;
      }
      if (!response.ok || !body.ok) {
        setFeedback(body.error ?? "Opslaan lukte niet.");
        return;
      }
      onChanged({ ...lead, contact_person: person, contact_email: email || null, ai_pitch: pitch, status });
      setFeedback("Wijzigingen opgeslagen.");
    } catch {
      setFeedback("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  }

  async function copyPitch() {
    setBusy("copy");
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(pitch);
      setFeedback("Pitch gekopieerd.");
    } catch {
      setFeedback("Kopiëren lukte niet. Selecteer de tekst en kopieer handmatig.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setFeedback(null);
    try {
      if (!email.trim()) {
        setFeedback("Vul een e-mailadres in van de HR-afdeling.");
        return;
      }
      if (!pitch.trim()) {
        setFeedback("Er is nog geen pitch om te versturen.");
        return;
      }
      if (preview) {
        const mailto = buildMailto(email, pitch);
        setStatus("sent");
        onChanged({ ...lead, status: "sent", contact_person: person, contact_email: email, ai_pitch: pitch });
        setFeedback("Voorbeeld: mailprogramma geopend. Er is niets opgeslagen.");
        window.location.href = mailto;
        return;
      }
      const response = await fetch(`/api/leads/${lead.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_person: person, contact_email: email, ai_pitch: pitch }),
      });
      const body = await readResponse<{ ok?: boolean; error?: string; mailto?: string }>(response);
      if (!body) {
        setFeedback("De server gaf een ongeldig antwoord.");
        return;
      }
      if (!response.ok || !body.ok) {
        setFeedback(body.error ?? "Versturen lukte niet.");
        return;
      }
      setStatus("sent");
      onChanged({ ...lead, status: "sent", contact_person: person, contact_email: email, ai_pitch: pitch });
      setFeedback("Mailprogramma geopend. De lead staat op verstuurd.");
      if (body.mailto) window.location.href = body.mailto;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Versturen lukte niet.");
    } finally {
      setBusy(null);
    }
  }

  async function sendPitch() {
    if (sendingRef.current) return;
    if (sentLock.current || pitchAlreadySent) {
      setFeedback("Deze pitch is al verstuurd.");
      return;
    }
    if (!isValidEmail(email)) {
      setFeedback("Email ontbreekt");
      return;
    }
    sendingRef.current = true;
    setBusy("resend");
    setFeedback(null);
    try {
      if (!pitch.trim()) {
        setFeedback("Er is nog geen pitch om te versturen.");
        return;
      }
      if (preview) {
        setFeedback("Voorbeeldweergave: er wordt geen mail via Resend verstuurd.");
        return;
      }

      const recipient = email.trim();
      const letter = pitch.trim();
      const { subject } = splitPitch(letter);
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          htmlContent: letter,
          leadId: lead.id,
        }),
      });
      const body = await readResponse<{ success?: boolean; error?: string; tracked?: boolean }>(response);
      if (!body) {
        setFeedback("De server gaf een ongeldig antwoord. Er is niets verstuurd.");
        return;
      }
      if (response.status === 409) {
        sentLock.current = true;
        setStatus("sent");
        setEmailStatus((current) => current ?? "sent");
        onChanged({
          ...lead,
          status: "sent",
          contact_person: person,
          contact_email: recipient,
          ai_pitch: letter,
          email_status: emailStatus ?? "sent",
        });
        setFeedback(body.error ?? "Deze pitch is al verstuurd.");
        return;
      }
      if (!response.ok || !body.success) {
        setFeedback(body.error ?? "Versturen via Resend lukte niet.");
        return;
      }

      sentLock.current = true;
      setEmailStatus("sent");
      const saved = await fetch(`/api/leads/${lead.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_person: person, contact_email: recipient, ai_pitch: letter }),
      });
      if (saved.ok) setStatus("sent");
      onChanged({
        ...lead,
        status: saved.ok ? "sent" : lead.status,
        contact_person: person,
        contact_email: recipient,
        ai_pitch: letter,
        email_status: "sent",
      });
      if (!saved.ok) {
        setFeedback("De mail is verstuurd via Resend. De status in het dashboard is niet bijgewerkt.");
        return;
      }
      setFeedback(
        body.tracked === false
          ? "Pitch verstuurd via Resend. Voer database/schema.sql opnieuw uit om de leesstatus op te slaan."
          : "Pitch verstuurd via Resend.",
      );
    } catch {
      setFeedback(
        sentLock.current
          ? "De mail is verstuurd via Resend. De status in het dashboard is niet bijgewerkt."
          : "Geen verbinding. De pitch is niet verstuurd. Probeer het opnieuw.",
      );
    } finally {
      sendingRef.current = false;
      setBusy(null);
    }
  }

  async function regenerate() {
    if (preview) {
      setFeedback("In de voorbeeldweergave wordt geen nieuw model aangeroepen.");
      return;
    }
    setBusy("regenerate");
    setFeedback(null);
    try {
      const response = await fetch(`/api/leads/${lead.id}/regenerate`, { method: "POST" });
      const body = await readResponse<{ ok?: boolean; error?: string; ai_pitch?: string; status?: string }>(response);
      if (!body) {
        setFeedback("De server gaf een ongeldig antwoord.");
        return;
      }
      if (!response.ok || !body.ok || !body.ai_pitch) {
        setFeedback(body.error ?? "Opnieuw genereren lukte niet.");
        if (body.error) setStatus("pitch_failed");
        return;
      }
      setPitch(body.ai_pitch);
      setStatus(body.status ?? "pending");
      onChanged({ ...lead, ai_pitch: body.ai_pitch, status: body.status ?? "pending" });
      setFeedback("Nieuwe pitch gegenereerd. Lees hem voor je verstuurt.");
    } catch {
      setFeedback("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  }

  const pill =
    status === "sent" ? "bg-moss text-pine" : status === "pitch_failed" ? "bg-orange-50 text-signal" : "bg-sand text-ink";
  const missingPitch = !pitch.trim();
  const emailReady = isValidEmail(email);
  const canSendPitch = emailReady && !missingPitch && !pitchAlreadySent;
  const emailHintId = `email-missing-${lead.id}`;
  const title = lead.vacancy?.title?.trim() || "Vacature";

  return (
    <article className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink/50">
            {city} · {sourceUrl ? sourceLabel(sourceUrl) : "Bron"}
            {lead.created_at ? ` · ${formatWhen(lead.created_at)}` : ""}
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">{title}</h2>
          <p className="mt-1 text-sm text-ink/70">
            {company}
            {lead.vacancy?.location ? ` · ${lead.vacancy.location}` : ""}
          </p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold ${pill}`}>{leadStatusLabel(status)}</span>
      </div>

      {demoSource ? (
        <p className="mt-3 text-sm text-ink/60">Voorbeeldtrigger, geen live vacature.</p>
      ) : sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-block text-sm underline">
          Bekijk vacature
        </a>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Contactpersoon
          <input
            className={inputClass}
            value={person}
            placeholder="HR-manager"
            onChange={(event) => setPerson(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          E-mailadres
          <input
            className={inputClass}
            type="email"
            value={email}
            placeholder="hr@bedrijf.nl"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 grid gap-1 text-sm">
        Pitch
        <textarea
          className={`${inputClass} min-h-64 font-serif text-[15px] leading-relaxed`}
          value={pitch}
          placeholder="Nog geen pitch. Gebruik Opnieuw genereren voor een formele mail met 'u'."
          onChange={(event) => setPitch(event.target.value)}
        />
      </label>
      {missingPitch ? (
        <p className="mt-2 text-sm text-ink/70">Er is nog geen pitch voor deze vacature. Genereer er een voor je verstuurt.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {missingPitch ? (
          <button type="button" className={primaryBtn} disabled={busy !== null} onClick={regenerate}>
            {busy === "regenerate" ? "Schrijven…" : "Opnieuw genereren"}
          </button>
        ) : null}
        <button
          type="button"
          className={canSendPitch || busy === "resend" ? sendBtnReady : !emailReady && !pitchAlreadySent ? sendBtnMuted : primaryBtn}
          disabled={!canSendPitch || busy !== null}
          title={
            !emailReady && !pitchAlreadySent
              ? "Email ontbreekt"
              : pitchAlreadySent
                ? "Deze pitch is al verstuurd."
                : missingPitch
                  ? "Genereer eerst een pitch."
                  : undefined
          }
          aria-describedby={!emailReady && !pitchAlreadySent ? emailHintId : undefined}
          onClick={sendPitch}
        >
          {busy === "resend" ? "Versturen…" : pitchAlreadySent ? "Al verstuurd" : "Verstuur Pitch"}
        </button>
        <EmailStatusBadge status={emailStatus ?? (status === "sent" ? "sent" : null)} />
        {!emailReady && !pitchAlreadySent ? (
          <p id={emailHintId} className="text-sm text-ink/50">
            Email ontbreekt
          </p>
        ) : null}
        <button type="button" className={ghostBtn} disabled={busy !== null || missingPitch} onClick={send}>
          {busy === "send" ? "Bezig met klaarzetten…" : "Direct Versturen naar Bedrijf"}
        </button>
        <button type="button" className={ghostBtn} disabled={busy !== null || !pitch.trim()} onClick={copyPitch}>
          {busy === "copy" ? "Kopiëren…" : "Kopieer pitch"}
        </button>
        <button type="button" className={ghostBtn} disabled={busy !== null} onClick={save}>
          {busy === "save" ? "Opslaan…" : "Opslaan"}
        </button>
        {missingPitch ? null : (
          <button type="button" className={ghostBtn} disabled={busy !== null} onClick={regenerate}>
            {busy === "regenerate" ? "Schrijven…" : "Opnieuw genereren"}
          </button>
        )}
      </div>
      {feedback ? (
        <p role="status" className="mt-3 text-sm text-ink/80">
          {feedback}
        </p>
      ) : null}
    </article>
  );
}

function forwardEmailStatus(current: string | null, incoming: string | null): DashboardLead["email_status"] {
  if (!incoming || !isEmailTrackingStatus(incoming)) {
    return current && isEmailTrackingStatus(current) ? current : null;
  }
  if (!current || !isEmailTrackingStatus(current)) return incoming;
  return nextEmailStatus(current, incoming) ?? current;
}

function EmailStatusBadge({ status }: { status: string | null }) {
  if (!status || !isEmailTrackingStatus(status)) return null;
  const label = emailTrackingLabel(status);
  if (!label) return null;
  const tone =
    status === "opened"
      ? "bg-pine text-paper"
      : status === "delivered"
        ? "border border-pine bg-moss text-pine"
        : "bg-sand text-ink";
  const title =
    status === "opened"
      ? "De ontvanger heeft de mail geopend."
      : status === "delivered"
        ? "De mail is afgeleverd."
        : "De pitch is verzonden.";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold ${tone}`} title={title} role="status">
      <EmailStatusIcon status={status} />
      {label}
    </span>
  );
}

function EmailStatusIcon({ status }: { status: EmailTrackingStatus }) {
  if (status === "opened") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z" />
        <circle cx="8" cy="8" r="1.6" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 4.5h12v8H2v-8Z" />
        <path d="M2.5 5 8 9l5.5-4" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 8.5 13.5 3 9.5 13l-1.2-3.8L2 8.5Z" />
    </svg>
  );
}

function contactOrFallback(value: string | null): string {
  const text = textOrEmpty(value).trim();
  return text || "HR-manager";
}

function textOrEmpty(value: string | null): string {
  return typeof value === "string" ? value : "";
}

async function readResponse<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
