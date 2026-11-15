import Link from "next/link";
import { PilotForm } from "@/components/PilotForm";
import { SiteHeader } from "@/components/SiteHeader";

const CITIES = ["Tilburg", "Eindhoven", "Waalwijk", "Oss", "Breda", "Helmond", "Son", "Den Bosch"];

export const metadata = {
  title: "Vacaturetriggers voor logistieke uitzendbureaus",
  description:
    "FlexTrigger scant Indeed.nl en StepStone.nl op magazijn- en logistiekvacatures in Tilburg en Eindhoven en schrijft een korte Nederlandse acquisitiemail.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="inhoud">
        <section className="grid-fade border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">
                Uitzendbureaus · Logistiek · Noord-Brabant
              </p>
              <h1 className="mt-4 max-w-xl font-serif text-4xl leading-[1.08] tracking-tight md:text-6xl">
                De vacature staat online. Jouw mail kan er dezelfde ochtend liggen.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
                FlexTrigger leest nieuwe magazijn- en logistiekvacatures op Indeed.nl en StepStone.nl in Tilburg en
                Eindhoven. Per vacature ligt er een korte acquisitiemail klaar voor de HR-manager die de functie net
                opende. Jij leest, past aan en verstuurt zelf.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/#pilot" className="bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-ink/90">
                  Start een gratis pilot
                </Link>
                <Link href="/dashboard" className="border border-ink px-5 py-3 text-sm font-semibold hover:bg-white">
                  Open het dashboard
                </Link>
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <Fact value="2" label="bronnen" />
                <Fact value="2" label="steden in de scan" />
                <Fact value="1" label="concept per vacature" />
                <Fact value="0" label="mails zonder jouw klik" />
              </dl>
            </div>
            <ExampleCard />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-serif text-3xl tracking-tight">Waarom bureaus de vacature missen</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Problem
              title="Te laat"
              body="De vacature is een dag oud en drie bureaus hebben al gebeld. Degene die dezelfde ochtend mailt, voert het gesprek."
            />
            <Problem
              title="Te algemeen"
              body="“Wij leveren personeel” zegt niets over deze functie in deze plaats. HR-managers herkennen een standaardmail in één zin."
            />
            <Problem
              title="Te veel handwerk"
              body="Zoeken, kopiëren, een mail typen. Tegen de tijd dat die de deur uit is, staat de volgende orderpickvacature al online."
            />
          </div>
        </section>

        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-serif text-3xl tracking-tight">Wat FlexTrigger doet</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <Feature
                number="01"
                title="Speed-to-lead"
                body="De scan pakt zoekpagina’s van de laatste dagen. Een bronlink die al in de database staat, krijgt geen tweede pitch."
              />
              <Feature
                number="02"
                title="Indeed.nl en StepStone.nl"
                body="De zoekpagina’s worden via ZenRows opgehaald, met JavaScript-rendering, zodat de vacaturekaarten in de HTML staan."
              />
              <Feature
                number="03"
                title="Nederlands dat een HR-manager uitleest"
                body="Het model schrijft een korte mail zonder verzonnen cijfers, klantnamen of tarieven. Jij houdt de pen en de afsluiting."
              />
              <Feature
                number="04"
                title="Versturen blijft een menselijke klik"
                body="De knop Verstuur Pitch stuurt de mail via Resend naar het gevonden adres. Er gaat niets de deur uit zonder jouw klik."
              />
            </div>
          </div>
        </section>

        <section id="werkwijze" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-serif text-3xl tracking-tight">Drie stappen, daarna is het jouw gesprek</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            <Step
              step="1"
              title="Scan"
              body="Elke werkdag de zoekresultaten voor magazijnmedewerkers en orderpickers in Tilburg en Eindhoven."
            />
            <Step
              step="2"
              title="Leg vast"
              body="Bedrijf, plaats, functietitel en bronlink gaan naar Supabase. Uitzendbureaus als opdrachtgever slaan we over."
            />
            <Step
              step="3"
              title="Schrijf"
              body="De pitch staat in het dashboard. Aanpasbaar, kopieerbaar, en klaar om vanuit je eigen mailadres te sturen."
            />
          </ol>
        </section>

        <section className="border-t border-line bg-sand/60">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Voor wie</p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl tracking-tight">
              Bureaus die de magazijnvloer bemensen, niet de kantoorverdieping.
            </h2>
            <p className="mt-4 max-w-2xl text-ink/80">
              Orderpickers, magazijnmedewerkers, reachtruckchauffeurs, inpakkers en laders/lossers bij distributiecentra.
              De scanner kijkt nu naar Tilburg en Eindhoven. De pilot is voor bureaus die ook in de rest van
              Noord-Brabant plaatsen.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {CITIES.map((city) => (
                <li key={city} className="border border-line bg-paper px-3 py-1.5 text-sm">
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pilot" className="bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_0.9fr] md:py-20">
            <div>
              <h2 className="font-serif text-4xl tracking-tight">Start een gratis pilot</h2>
              <p className="mt-4 max-w-md text-paper/75">
                Twee weken, één regio. We koppelen je bureau, laten de eerste triggers zien en jij beslist of de
                pitches scherp genoeg zijn om te versturen.
              </p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-paper/60">
                FlexTrigger verstuurt geen mail namens jou. Je blijft zelf verantwoordelijk voor de tekst en voor de
                regels rond commerciële e-mail.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5 md:p-6">
              <PilotForm />
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink/70">
          <p>FlexTrigger NL · Logistiek en warehousing</p>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/#pilot" className="hover:text-ink">
              Pilot
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-serif text-2xl">{value}</dt>
      <dd className="mt-1 text-ink/70">{label}</dd>
    </div>
  );
}

function ExampleCard() {
  return (
    <aside className="relative bg-white p-6 shadow-card">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-signal" />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Voorbeeldtrigger · Tilburg</p>
      <h2 className="mt-3 font-serif text-2xl leading-tight">Magazijnmedewerker / reachtruck</h2>
      <p className="mt-1 text-sm text-ink/70">Voorbeeld DC Brabant · geen live vacature</p>
      <div className="mt-5 border border-line bg-paper p-4 font-serif text-[15px] leading-relaxed text-ink/90">
        <p>Onderwerp: Magazijncapaciteit in Tilburg</p>
        <p className="mt-3">
          Beste heer/mevrouw, ik zag dat u in Tilburg een magazijnmedewerker zoekt die ook met de reachtruck kan werken.
          Heeft u deze week 15 minuten?
        </p>
      </div>
      <p className="mt-4 text-xs text-ink/55">Zo staat een pitch in het dashboard. Dit voorbeeld is niet verstuurd.</p>
    </aside>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <article className="border border-line bg-white p-5">
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">{body}</p>
    </article>
  );
}

function Feature({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <article>
      <p className="font-serif text-sm text-signal">{number}</p>
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/75">{body}</p>
    </article>
  );
}

function Step({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <li className="border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">Stap {step}</p>
      <h3 className="mt-2 font-serif text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">{body}</p>
    </li>
  );
}
