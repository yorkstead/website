import type { CaseStudy } from "./case-studies";

export const ellwoodStory: NonNullable<CaseStudy["workflowStory"]> = {
  demoUrl: "/demos/ellwood",
  observation: "Experience at a previous job suggested that the difficult part of a revision is not saving a new drawing. It is knowing which instructions people already hold, what work has started, and what decision must travel to the shop. Ellwood explores that problem as a concept; it was not adopted by that employer.",
  handoffs: [
    { role: "Drawing → Release", before: "A new file arrives beside the old instructions.", after: "Each release carries its current revision and approval status." },
    { role: "Release → Queue", before: "Someone must remember which work is cleared to start.", after: "The production queue shows which marks are still waiting on an approved drawing packet." },
    { role: "Queue → Shop", before: "Old identifiers and instructions remain in circulation.", after: "Scans are recorded against the mark, and the scan station includes a test for an obsolete revision barcode." },
    { role: "Shop → Shipping", before: "Quality results and ship plans live in separate files.", after: "Inspections stay on the release record, and pallet plans are generated only from approved revisions." },
  ],
  scenarios: [
    { id: "release", title: "Release and revision", description: "Open a release and see its current revision, approval status and panel marks.", href: "/demos/ellwood#release" },
    { id: "queue", title: "Production queue", description: "Dispatch work by station and see which marks are waiting on an approved packet.", href: "/demos/ellwood#queue" },
    { id: "scan", title: "Shop-floor scan", description: "Scan a mark and record the movement in a ledger.", href: "/demos/ellwood#scan" },
    { id: "quality", title: "Quality ledger", description: "Record inspections, measurements, holds and remake cost against the release.", href: "/demos/ellwood#quality" },
    { id: "pallets", title: "Pallet plan", description: "Plan pallets from approved revisions and track them to shipment.", href: "/demos/ellwood#pallets" },
  ],
  architecture: [
    { title: "Grounded in a working prototype", description: "The walkthrough uses screens captured from the running Ellwood Flow prototype, so what you see is what the software does today." },
    { title: "Example data only", description: "Jobs, panel marks, customers and people in the screens are examples. No operational database or customer record is connected to this website." },
    { title: "A concept, not a deployed system", description: "Ellwood Flow is inspired by past workplace experience and was not adopted by that employer. It has not been measured in a live shop." },
  ],
};
