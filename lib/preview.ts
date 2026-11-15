import type { CompanyRecord, DashboardLead } from "@/lib/types";

const SAMPLE_PITCH_TILBURG = `Onderwerp: Magazijncapaciteit in Tilburg

Beste heer/mevrouw,

Ik zag dat u in Tilburg een magazijnmedewerker zoekt die ook met de reachtruck kan werken. Die combinatie blijft lastig vullen wanneer de operatie niet op een lange procedure kan wachten.

Wij zetten magazijnmedewerkers in bij distributiecentra in de regio. Voor een rol als deze stellen we mensen voor die orderpicken, inpakken en, waar het certificaat klopt, reachtruck rijden.

Heeft u deze week 15 minuten om te kijken of wij de vacature kunnen opvangen?

Met vriendelijke groet,
[Naam]
[Uitzendbureau]
[Telefoonnummer]`;

const SAMPLE_PITCH_EINDHOVEN = `Onderwerp: Orderpickers voor Eindhoven

Beste heer/mevrouw,

U hebt in Eindhoven een orderpicker nodig voor het distributiecentrum. Zulke plekken lopen snel vol op piekdagen, en een open vacature betekent meestal dat de ploeg nu al schuift.

Wij leveren orderpickers en inpakkers die een magazijnvloer kennen. We kunnen deze week kandidaten voorstellen die in de regio kunnen starten.

Heeft u 15 minuten voor een kort gesprek over de bezetting?

Met vriendelijke groet,
[Naam]
[Uitzendbureau]
[Telefoonnummer]`;

export const PREVIEW_LEADS: DashboardLead[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    contact_person: "HR-manager",
    contact_email: null,
    ai_pitch: SAMPLE_PITCH_TILBURG,
    status: "pending",
    email_status: "opened",
    created_at: "2026-11-12T06:10:00.000Z",
    vacancy: {
      id: "00000000-0000-4000-8000-000000000011",
      title: "Magazijnmedewerker / reachtruck",
      source_url: "https://demo.flextrigger.nl/triggers/tilburg-magazijn",
      location: "Tilburg",
      status: "demo",
      company: {
        name: "Voorbeeld DC Brabant",
        city: "Tilburg",
        website: null,
      },
    },
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    contact_person: "HR-manager",
    contact_email: "hr@voorbeeld-fulfilment.nl",
    ai_pitch: SAMPLE_PITCH_EINDHOVEN,
    status: "pending",
    email_status: null,
    created_at: "2026-11-12T06:40:00.000Z",
    vacancy: {
      id: "00000000-0000-4000-8000-000000000012",
      title: "Orderpicker distributiecentrum",
      source_url: "https://demo.flextrigger.nl/triggers/eindhoven-orderpicker",
      location: "Eindhoven",
      status: "demo",
      company: {
        name: "Voorbeeld Fulfilment Eindhoven",
        city: "Eindhoven",
        website: null,
      },
    },
  },
];

export const PREVIEW_COMPANIES: CompanyRecord[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "24/7 Drive",
    website: "https://www.247drive.nl/",
    city: "Son",
    created_at: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "E&A Uitzendbureau",
    website: "https://www.eena.nl/",
    city: "Tilburg",
    created_at: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Logistics Staffing",
    website: "https://logisticsstaffing.nl/",
    city: "Rotterdam",
    created_at: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "WerkTalent",
    website: "https://www.werktalent.com/",
    city: "Eindhoven",
    created_at: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    name: "Voorbeeld DC Brabant",
    website: null,
    city: "Tilburg",
    created_at: "2026-11-12T06:10:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    name: "Voorbeeld Fulfilment Eindhoven",
    website: null,
    city: "Eindhoven",
    created_at: "2026-11-12T06:40:00.000Z",
  },
];
