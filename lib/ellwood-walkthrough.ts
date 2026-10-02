import type { WalkthroughStep } from "./walkthrough";

/** Screens captured from the running Ellwood Flow prototype, which uses example jobs and panel marks. */
const base = "/media/ellwood/walkthrough";

export const ellwoodWalkthroughSteps: WalkthroughStep[] = [
  {
    id: "release",
    label: "Release",
    device: "desktop",
    who: "Office",
    title: "One release, one current revision",
    body: "Each release is keyed by job and release number, and its page opens with the current revision and whether it is approved for the shop floor. Required dates, priority, panel marks and controlled drawings sit beside it instead of in separate folders and emails.",
    detail: "A blocker or hold, when there is one, shows next to the revision so nobody has to ask whether the release is actually ready.",
    image: { src: `${base}/release.webp`, width: 1440, height: 752, alt: "Active release page for an example architectural panel job showing Rev 1 (A) approved for the shop floor, shop-floor action buttons, a department pipeline, panel marks and recent activity" },
  },
  {
    id: "queue",
    label: "Queue",
    device: "desktop",
    who: "Production lead",
    title: "Send approved work to the right station",
    body: "The production queue lists every operation step by panel mark, with its planned and finished counts, its station and a readiness state. Work that is still waiting on an approved drawing packet says so, in the queue, before it is dispatched.",
    detail: "Department totals across routing, extrusion, assembly, quality and shipping sit at the top so a lead can see where the day's work stands.",
    image: { src: `${base}/production.webp`, width: 1440, height: 756, alt: "Production planning page with department totals and a queue of panel marks showing routing step, readiness state, planned and done counts, station and a Dispatch button" },
  },
  {
    id: "scan",
    label: "Scan",
    device: "desktop",
    who: "Shop floor",
    title: "Scan a mark and the movement is recorded",
    body: "At a station, an operator scans a barcode or types a mark or release number. Every scan lands in a movement ledger with the transition, quantity, condition, operator, station and time.",
    detail: "The scan station also carries quick-test barcodes, including one for an obsolete revision, so the check that an old identifier is refused can be tried on the floor.",
    image: { src: `${base}/scan.webp`, width: 1440, height: 498, alt: "Shop floor scan station with a barcode input, quick test barcodes including an obsolete revision barcode, station status and a movement ledger" },
  },
  {
    id: "quality",
    label: "Quality",
    device: "desktop",
    who: "Quality",
    title: "Record the inspection where the work is tracked",
    body: "Inspections are logged against the mark and release with the disposition, caliper measurements, inspector and notes. Open non-conformances, holds and remake cost are counted at the top.",
    detail: "Because the ledger shares the release record, a failed inspection can hold the work instead of living in a separate spreadsheet.",
    image: { src: `${base}/quality.webp`, width: 1440, height: 484, alt: "Quality page with counts of active holds, open non-conformances and remakes, and an inspection ledger listing marks, dispositions, caliper measurements and notes" },
  },
  {
    id: "pallets",
    label: "Pallets",
    device: "desktop",
    who: "Shipping",
    title: "Plan pallets from approved revisions only",
    body: "The pallet planner groups panel marks by elevation, works out material borders and packs within weight limits. It only generates a plan for a release whose revision is approved and current.",
    detail: "Pallets move through plan, build, staged and shipped, with counts for each at the top of the page.",
    image: { src: `${base}/pallets.webp`, width: 1440, height: 609, alt: "Palletizing and staging page with counts of pallets by stage, a target release selector and a button to generate a recommended pallet plan" },
  },
];
