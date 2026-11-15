"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PilotForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: data.get("agencyName"),
          contactName: data.get("contactName"),
          email: data.get("email"),
          city: data.get("city"),
          websiteConfirm: data.get("websiteConfirm"),
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Versturen lukte niet.");
        return;
      }
      setStatus("sent");
      setMessage("Aanvraag binnen. Het dashboard wordt geopend.");
      form.reset();
      router.push("/dashboard?pilot=1");
    } catch {
      setStatus("error");
      setMessage("Geen verbinding. Probeer het opnieuw.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input name="websiteConfirm" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Uitzendbureau" name="agencyName" autoComplete="organization" required />
      <Field label="Jouw naam" name="contactName" autoComplete="name" required />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Plaats" name="city" autoComplete="address-level2" placeholder="Tilburg" />
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-2 bg-signal px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {status === "sending" ? "Versturen…" : "Start de gratis pilot"}
      </button>
      {message ? (
        <p role="status" className={status === "error" ? "text-sm text-signal" : "text-sm text-moss"}>
          {message}
        </p>
      ) : (
        <p className="text-sm text-paper/70">Twee weken, één regio. Geen jaarabonnement in deze pilot.</p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-paper/80">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="border border-white/15 bg-white px-3 py-2.5 text-ink outline-none"
      />
    </label>
  );
}
