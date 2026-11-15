export type SearchSource = "indeed" | "stepstone";

export type SearchTarget = {
  city: string;
  source: SearchSource;
  url: string;
};

export const SEARCH_TARGETS: SearchTarget[] = [
  {
    city: "Tilburg",
    source: "indeed",
    url: "https://nl.indeed.com/jobs?q=magazijnmedewerker&l=Tilburg&fromage=3&sort=date",
  },
  {
    city: "Eindhoven",
    source: "indeed",
    url: "https://nl.indeed.com/jobs?q=orderpicker&l=Eindhoven&fromage=3&sort=date",
  },
  {
    city: "Tilburg",
    source: "stepstone",
    url: "https://www.stepstone.nl/vacatures/magazijnmedewerker/in-tilburg",
  },
  {
    city: "Eindhoven",
    source: "stepstone",
    url: "https://www.stepstone.nl/vacatures/orderpicker/in-eindhoven",
  },
];
