import assert from "node:assert/strict";
import { emailStatusFromEvent, leadIdFromTags, nextEmailStatus } from "../lib/email-status";
import { isStaffingIntermediary } from "../lib/employers";
import { buildMailto, emailForCompany, pickEmail, splitPitch } from "../lib/mailto";
import { parseSendEmailInput } from "../lib/send-email-input";
import { PITCH_SYSTEM_PROMPT } from "../lib/openrouter";
import { parseJobSearchHtml } from "../lib/parse-jobs";
import { SEARCH_TARGETS } from "../lib/targets";

const html = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Heftruckchauffeur",
  "description": "<p>Heftruckchauffeur in Waalwijk. Mail hr@voorbeeld-dc.nl</p>",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Voorbeeld DC Waalwijk",
    "sameAs": "https://voorbeeld-dc.nl",
    "email": "hr@voorbeeld-dc.nl"
  },
  "jobLocation": { "@type": "Place", "address": { "addressLocality": "Waalwijk" } },
  "url": "https://nl.indeed.com/viewjob?jk=abc123def456abc1"
}
</script>
<div data-jk="abc123def456abc1">
  <a class="jcs-JobTitle" aria-label="Heftruckchauffeur">Heftruckchauffeur</a>
  <span data-testid="company-name">Voorbeeld DC Waalwijk</span>
</div>
<div data-jk="bbb222ccc333ddd4">
  <a class="jcs-JobTitle" aria-label="Orderpicker" href="/viewjob?jk=bbb222ccc333ddd4">Orderpicker</a>
  <span data-testid="company-name">Coolblue</span>
  <div data-testid="text-location">Tilburg</div>
</div>
<a href="https://www.stepstone.nl/vacatures/magazijnmedewerker/in-tilburg">zoekresultaat</a>
<a href="https://www.stepstone.nl/vacatures/orderpicker-magazijn-eindhoven-99887766">Orderpicker magazijn</a>
<span data-at="job-item-company-name">Picnic</span>
`;

const jobs = parseJobSearchHtml(html, "https://nl.indeed.com/jobs?q=magazijnmedewerker&l=Eindhoven", "Eindhoven");
assert.equal(jobs.length, 3);

const heftruck = jobs.find((job) => job.title === "Heftruckchauffeur");
assert.ok(heftruck);
assert.equal(heftruck.companyName, "Voorbeeld DC Waalwijk");
assert.equal(heftruck.city, "Waalwijk");
assert.equal(heftruck.contactEmail, "hr@voorbeeld-dc.nl");
assert.equal(emailForCompany(html, "Voorbeeld DC Waalwijk"), "hr@voorbeeld-dc.nl");
assert.equal(pickEmail("logo@2x.png image@3x.jpg photo@2x.webp"), null);
assert.equal(
  pickEmail("support@w3.org example@domain.com noreply@bedrijf.nl info@voorbeeld-dc.nl hr@voorbeeld-dc.nl"),
  "hr@voorbeeld-dc.nl",
);
assert.equal(emailForCompany(html, "Coolblue"), null);
assert.equal(heftruck.sourceUrl, "https://nl.indeed.com/viewjob?jk=abc123def456abc1");
assert.match(heftruck.website ?? "", /^https:\/\/voorbeeld-dc\.nl\/?$/);
assert.match(heftruck.description, /Waalwijk/);

const orderpicker = jobs.find((job) => job.companyName === "Coolblue");
assert.ok(orderpicker);
assert.equal(orderpicker.title, "Orderpicker");
assert.equal(orderpicker.city, "Tilburg");
assert.equal(orderpicker.sourceUrl, "https://nl.indeed.com/viewjob?jk=bbb222ccc333ddd4");

const picnic = jobs.find((job) => job.companyName === "Picnic");
assert.ok(picnic);
assert.equal(picnic.title, "Orderpicker magazijn");
assert.equal(picnic.city, "Eindhoven");
assert.equal(picnic.sourceUrl, "https://www.stepstone.nl/vacatures/orderpicker-magazijn-eindhoven-99887766");
assert.equal(
  jobs.some((job) => job.sourceUrl.includes("/in-")),
  false,
);

assert.equal(isStaffingIntermediary("WerkTalent Eindhoven"), true);
assert.equal(isStaffingIntermediary("Randstad Tilburg"), true);
assert.equal(isStaffingIntermediary("Versteijnen Transport Services B.V."), false);
assert.equal(isStaffingIntermediary("Picnic"), false);

const pitch = "Onderwerp: Magazijncapaciteit in Tilburg\n\nBeste heer/mevrouw,\n\nKorte mail.";
const parts = splitPitch(pitch);
assert.equal(parts.subject, "Magazijncapaciteit in Tilburg");
assert.match(parts.body, /^Beste heer\/mevrouw/);
const mailto = buildMailto("hr@voorbeeld-dc.nl", pitch);
assert.match(mailto, /^mailto:hr@voorbeeld-dc\.nl\?/);
assert.match(mailto, /subject=/);
assert.throws(() => buildMailto("geen-adres", pitch));
const emptyMail = parseSendEmailInput({ to: "  ", subject: "Onderwerp", htmlContent: "Tekst" });
const invalidMail = parseSendEmailInput({ to: "geen-adres", subject: "Onderwerp", htmlContent: "Tekst" });
const emptyPitch = parseSendEmailInput({ to: "hr@voorbeeld-dc.nl", subject: "Onderwerp", htmlContent: " " });
const badLead = parseSendEmailInput({
  to: "hr@voorbeeld-dc.nl",
  subject: "Onderwerp",
  htmlContent: "Tekst",
  leadId: "nee",
});
assert.equal("error" in emptyMail && emptyMail.error, "Vul een e-mailadres in.");
assert.equal("error" in invalidMail && invalidMail.error, "Vul een geldig e-mailadres in.");
assert.equal("error" in emptyPitch && emptyPitch.error, "De pitch is leeg.");
assert.equal("error" in badLead && badLead.error, "Onbekende lead.");

assert.match(PITCH_SYSTEM_PROMPT, /Onderwerp/);
assert.match(PITCH_SYSTEM_PROMPT, /Verzin geen/);
assert.match(PITCH_SYSTEM_PROMPT, /Nederlands/);
assert.equal(emailStatusFromEvent("email.opened"), "opened");
assert.equal(emailStatusFromEvent("email.clicked"), null);
assert.equal(nextEmailStatus("sent", "delivered"), "delivered");
assert.equal(nextEmailStatus("opened", "delivered"), null);
assert.equal(leadIdFromTags({ lead_id: "00000000-0000-4000-8000-000000000001" }), "00000000-0000-4000-8000-000000000001");
assert.match(PITCH_SYSTEM_PROMPT, /'u' instead of 'je'/);
assert.match(PITCH_SYSTEM_PROMPT, /professioneel zakelijk Nederlands/);
assert.equal(splitPitch("Beste heer/mevrouw, korte mail.").subject.includes("jullie"), false);

assert.ok(SEARCH_TARGETS.some((target) => target.city === "Tilburg" && target.source === "indeed"));
assert.ok(SEARCH_TARGETS.some((target) => target.city === "Eindhoven" && target.source === "stepstone"));

console.log(`self-check ok (${jobs.length} vacatures herkend)`);
