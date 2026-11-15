const STAFFING_EMPLOYERS = [
  "24/7 drive",
  "e&a",
  "e&a uitzendbureau",
  "logistics staffing",
  "werktalent",
  "randstad",
  "tempo-team",
  "tempo team",
  "adecco",
  "manpower",
  "olympia",
  "youngcapital",
  "covebo",
  "timing uitzendbureau",
  "unique uitzendbureau",
  "start people",
  "abiant",
];

export function isStaffingIntermediary(name: string): boolean {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (normalized.includes("uitzend")) return true;
  return STAFFING_EMPLOYERS.some((brand) => normalized === brand || normalized.startsWith(`${brand} `));
}
