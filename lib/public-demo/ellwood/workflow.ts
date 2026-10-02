import type { PublicDemoManifest, PublicDemoScenario } from "../types";

export const manifest: PublicDemoManifest = {
  id: "ellwood", company: "Alder Panel Works", product: "Release Desk",
  description: "A drawing changed. Does the shop know?",
  caseStudyUrl: "/work/ellwood-flow", storyLabel: "Explore the concept",
  resetAfterMs: 30 * 60 * 1000,
};
export const scenarios: readonly PublicDemoScenario[] = [
  { id: "revision-change", title: "Revision after release", summary: "Revision B changes the fixing holes on panels AP-01 and AP-02. Revision A is already on the shop floor.", why: "Changing a drawing is only half the job. The people holding the old instructions need a clear next step." },
  { id: "normal", title: "Normal release", summary: "A complete drawing package is ready for review and its first shop-floor handoff.", why: "A deliberate readiness check makes the release decision visible." },
  { id: "missing-drawing", title: "Missing drawing", summary: "The release has panel quantities but no controlled drawing attached.", why: "A release number alone does not give the shop enough information to work." },
  { id: "blocked-release", title: "Blocked release", summary: "The fixing detail needs clarification before this release can proceed.", why: "A visible hold keeps an unresolved decision from becoming a shop-floor guess." },
];
export function getScenario(id?: string) { return scenarios.find(s => s.id === id) ?? scenarios[0]; }
export interface Release {
  scenarioId: string; drawing: boolean; hold: boolean; reviewed: boolean;
  approved: boolean; handedOff: boolean; current: "A" | "B"; target: "A" | "B"; history: string[];
}
export function seedRelease(id?: string): Release {
  const scenarioId = getScenario(id).id;
  return { scenarioId, drawing: scenarioId !== "missing-drawing", hold: scenarioId === "blocked-release", reviewed: false,
    approved: false, handedOff: false, current: "A", target: scenarioId === "revision-change" ? "B" : "A",
    history: [scenarioId === "revision-change" ? "Revision A released. Revision B received for review; shop handoff paused in this demo." : "Release 48216-01 received for review."] };
}
export type Action = "attach" | "resolve" | "review" | "approve" | "handoff" | "scan-old" | "scan-current";
export function readiness(release: Release): string | null {
  if (!release.drawing) return "Attach the missing drawing first.";
  if (release.hold) return "Resolve the fixing-detail hold first.";
  if (!release.reviewed) return "Review the drawing and affected work first.";
  return null;
}
export function transition(release: Release, action: Action): { release: Release; message: string; ok: boolean } {
  const reject = (message: string) => ({ release, message, ok: false });
  let update: Partial<Release> = {};
  let message: string;
  if (action === "scan-old") return reject(release.current === "B"
    ? "Blocked: revision A is superseded. Use the current revision B identifier."
    : "Revision A is not superseded yet. Complete review and approval before testing the obsolete identifier.");
  if (action === "scan-current") return release.handedOff
    ? { release, message: `Current revision ${release.current} accepted in this simulation. No production event was recorded.`, ok: true }
    : reject("Complete the approved shop-floor handoff first.");
  if (action === "attach") {
    if (release.drawing) return reject("The drawing is already attached.");
    update = { drawing: true }; message = "Synthetic controlled drawing attached.";
  } else if (action === "resolve") {
    if (!release.hold) return reject("There is no unresolved hold.");
    update = { hold: false }; message = "Demo decision recorded: fixing detail clarified; hold resolved.";
  } else if (action === "review") {
    if (!release.drawing) return reject("Attach the missing drawing before review.");
    if (release.hold) return reject("Resolve the fixing-detail hold before review.");
    if (release.reviewed) return reject("Review is already recorded.");
    update = { reviewed: true }; message = "Demo review recorded: AP-01 and AP-02 checked; AP-03 unchanged.";
  } else if (action === "approve") {
    const blocker = readiness(release); if (blocker) return reject(blocker);
    if (release.approved) return reject("This revision is already approved.");
    update = { approved: true, current: release.target };
    message = release.target === "B" ? "Revision B approved and current. Revision A retained as superseded." : "Revision A approved and current.";
  } else {
    if (!release.approved) return reject("Approve the current revision before the shop-floor handoff.");
    if (release.handedOff) return reject("The handoff is already acknowledged.");
    update = { handedOff: true }; message = `Demo shop-floor acknowledgment recorded for revision ${release.current}.`;
  }
  return { release: { ...release, ...update, history: [...release.history, message] }, message, ok: true };
}
