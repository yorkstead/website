import type { WalkthroughStep } from "./walkthrough";

export type { WalkthroughStep };

/** Screens captured from the running Rework Flow application, with a neutral company name and example data. */

const base = "/media/rework-flow/walkthrough";

export const reworkWalkthroughSteps: WalkthroughStep[] = [
  {
    id: "reserve",
    label: "Reserve",
    device: "phone",
    who: "Driver",
    title: "Reserve a rework bay from the road",
    body: "A driver rejected at a receiver picks the problem, sets how many pallets are affected, and gets a fixed price range and an assigned bay before they arrive.",
    detail: "The estimate comes from the same rate table the dock uses to bill, so the number the driver sees is the number the office starts from.",
    image: { src: `${base}/reserve.webp`, width: 824, height: 1960, alt: "Reserve Emergency Rework Bay form with problem type, pallet count slider, trailer, carrier, ETA and an estimated range of $469 to $618" },
  },
  {
    id: "intake",
    label: "Intake",
    device: "phone",
    who: "Dock operator",
    title: "Intake on a phone or tablet",
    body: "At the dock, the operator confirms the rework type, trailer, carrier, driver and bay. Big touch targets are sized for work gloves.",
    image: { src: `${base}/dock-intake.webp`, width: 824, height: 1420, alt: "Dock step 1 intake screen with rework type choices, trailer number, carrier, bay and driver fields" },
  },
  {
    id: "before",
    label: "Before photos",
    device: "phone",
    who: "Dock operator",
    title: "Photograph the problem before touching it",
    body: "Two guided shots, a wide view and a close-up of the defect, record the condition the freight arrived in.",
    detail: "These photos travel with the job, so a later dispute about damage starts from evidence instead of memory.",
    image: { src: `${base}/dock-before.webp`, width: 824, height: 1520, alt: "Dock step 2 showing a wide photo of shifted cargo and a close-up of broken pallet runners" },
  },
  {
    id: "tally",
    label: "Tally",
    device: "phone",
    who: "Dock operator",
    title: "Tally supplies and labor as they are used",
    body: "Pallets, stretch wrap, corner boards and forklift time are counted with plus and minus buttons. The live invoice updates with every tap.",
    image: { src: `${base}/dock-tally.webp`, width: 824, height: 1460, alt: "Dock step 3 supply and labor tally with counters and a live invoice of $384.25" },
  },
  {
    id: "sign",
    label: "Sign-off",
    device: "phone",
    who: "Driver",
    title: "After photo and driver sign-off on the glass",
    body: "The finished pallet is photographed, and the driver signs on the screen. Dispatching sends the completed record to the office.",
    image: { src: `${base}/dock-sign.webp`, width: 824, height: 1500, alt: "Dock step 4 with a road-ready photo, a drawn driver signature and a Dispatch Certificate button" },
  },
  {
    id: "board",
    label: "Office board",
    device: "desktop",
    who: "Office",
    title: "The office board updates on its own",
    body: "The office screen watches for new work and alerts when the dock dispatches. Billing, bay occupancy and every job's status are on one board.",
    detail: "The dispute-rate and turnaround tiles are illustrative placeholders in this build, not measured results.",
    image: { src: `${base}/office-board.webp`, width: 1440, height: 792, alt: "Office board with billing, bay occupancy and a table of completed jobs with a new job alert" },
  },
  {
    id: "certificate",
    label: "Packet",
    device: "desktop",
    who: "Office",
    title: "One completion packet for billing and disputes",
    body: "Each job produces a printable certificate: before and after photos, an itemized invoice, and the driver's signature. Jobs can also be exported for QuickBooks.",
    image: { src: `${base}/office-certificate.webp`, width: 1440, height: 1000, alt: "Completion packet with before and after photos, an itemized materials and labor invoice and a driver signature" },
  },
];
