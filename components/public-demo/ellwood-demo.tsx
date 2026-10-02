"use client";
import { useState } from "react";
import { DemoControls, WhyThisExists } from "./demo-controls";
import { useDemoExpiry } from "./use-demo-expiry";
import { getScenario, manifest, scenarios, seedRelease, transition, readiness, type Action } from "@/lib/public-demo/ellwood/workflow";
import styles from "./demo-shell.module.css";

const steps = [
  { title: "Inspect the incoming package", instruction: "Compare the drawing and release context. In the missing-drawing or blocked-release scenario, resolve the visible gap first." },
  { title: "Review the affected work", instruction: "Check AP-01 and AP-02 against the proposed instructions. Record the demo review before approval." },
  { title: "Make the current revision explicit", instruction: "Approve the reviewed revision. In the revision-change scenario, revision A becomes superseded and remains visible in history." },
  { title: "Close the shop-floor handoff", instruction: "Acknowledge the handoff, then try the current identifier. For revision B, also try the old identifier and inspect the blocking warning." },
];

export function EllwoodDemo({ initialScenario, initialGuided = false }: { initialScenario?: string; initialGuided?: boolean }) {
  const [release, setRelease] = useState(() => seedRelease(initialScenario));
  const [guided, setGuided] = useState(initialGuided);
  const [step, setStep] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [message, setMessage] = useState("Your private practice session is ready.");
  const scenario = getScenario(release.scenarioId);
  function reset(id = scenario.id, expired = false) {
    setRelease(seedRelease(id)); setStep(0); setGeneration(value => value + 1);
    setMessage(expired ? "The 30-minute session expired and reset to synthetic fixtures." : "Sandbox reset. Previous practice changes were discarded.");
  }
  useDemoExpiry(manifest.resetAfterMs, `${scenario.id}:${generation}`, () => reset(scenario.id, true));
  function act(action: Action) {
    const result = transition(release, action); setRelease(result.release); setMessage(result.message);
    if (result.ok && action === "review") setStep(2);
    if (result.ok && action === "approve") setStep(3);
  }
  return <div className={styles.root}>
    <DemoControls manifest={manifest} scenarios={scenarios} scenarioId={scenario.id} guided={guided}
      onScenario={id => reset(id)} onReset={() => reset()} onGuide={() => { setGuided(value => !value); setStep(0); }} />
    <header className={styles.hero}><div><p className={styles.eyebrow}>{manifest.company} · {manifest.product}</p><h1>{manifest.description}</h1><p>{scenario.summary}</p></div><p className={styles.signal}>Ellwood Flow · Concept prototype<br />Inspired by a previous job. This fictional simulation is not an employer deployment.</p></header>
    {guided && <section className={styles.panel} aria-label="Guided walkthrough"><p className={styles.eyebrow}>Step {step + 1} of {steps.length}</p><h2>{steps[step].title}</h2><p>{steps[step].instruction}</p><div className={styles.actions}><button disabled={step === 0} onClick={() => setStep(step - 1)}>Previous step</button><button disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Next step</button></div></section>}
    <p role="status" aria-live="polite" className={styles.status}>{message}</p>
    <div className={styles.grid}><div>
      <section className={styles.panel}><p className={styles.eyebrow}>Fictional job 48216 · Release 01</p><h2>One release. A visible decision.</h2>
        <dl className={styles.meta}><div><dt>Current revision</dt><dd data-testid="current-revision">{release.current}</dd></div><div><dt>Under review</dt><dd>Revision {release.target}</dd></div><div><dt>Drawing package</dt><dd>{release.drawing ? "Synthetic drawing attached" : "Missing drawing"}</dd></div><div><dt>Shop-floor handoff</dt><dd data-testid="handoff-state">{release.handedOff ? "Acknowledged" : "Awaiting approved handoff"}</dd></div></dl>
        <figure className={styles.panel}><svg viewBox="0 0 440 160" role="img" aria-label="Synthetic panel drawing comparing revision A and proposed revision B fixing holes" style={{ width: "100%", maxHeight: 180 }}><rect x="20" y="20" width="175" height="110" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="245" y="20" width="175" height="110" fill="none" stroke="currentColor" strokeWidth="2"/>{[45,170,270,395].map(x => <circle key={x} cx={x} cy={x > 200 ? 55 : 40} r="5" fill="currentColor"/>)}<text x="65" y="100" fill="currentColor">Revision A</text><text x="290" y="100" fill="currentColor">Revision B</text></svg><figcaption>Synthetic comparison illustration: fixing holes move 15 mm. Not a fabrication drawing. {release.target === "A" ? "This scenario releases A; B is shown only to explain the revision concept." : "B is the candidate revision for this scenario."}</figcaption></figure>
        <p className={styles.notice}>{release.approved ? `Revision ${release.current} is approved in the demo.` : readiness(release) ?? "Ready for the demo approval decision."}</p>
        <div className={styles.actions}>{!release.drawing && <button onClick={() => act("attach")}>Attach synthetic drawing</button>}{release.hold && <button onClick={() => act("resolve")}>Record demo clarification</button>}<button onClick={() => act("approve")} disabled={release.approved}>Approve reviewed revision</button></div>
        <WhyThisExists>{scenario.why} Source behavior: approving a revision makes it current and supersedes the earlier revision. Drawing completeness and review gates here are proposed demo rules.</WhyThisExists>
      </section>
      <section className={styles.panel}><h2>What work needs attention?</h2><p>Fictional review plan · proposed demo extension</p><ul><li><strong>AP-01 · 8 panels:</strong> {release.target === "B" ? "Not started. Replace A instructions with B after approval." : "Check fixing detail and quantities."}</li><li><strong>AP-02 · 4 panels:</strong> {release.target === "B" ? "Already cut. Hold for an engineering decision; this demo does not authorize rework or scrap." : "Check drawing readiness before cutting."}</li><li><strong>AP-03 · 6 panels:</strong> No geometry change in this example.</li></ul><p>The acknowledgment below records review of this plan, not physical completion or engineering acceptance.</p><div className={styles.actions}><button disabled={release.reviewed} onClick={() => act("review")}>Record affected-work review</button></div><WhyThisExists>A new file does not explain what happens to work already started. This proposed review makes that decision explicit without claiming automated impact analysis in the source system.</WhyThisExists></section>
      <section className={styles.panel}><h2>Carry the decision to the shop</h2><p>Current revision: <strong>{release.current}</strong>. {release.current === "B" ? "A remains in history as superseded." : "A has not been superseded."}</p><div className={styles.actions}><button disabled={release.handedOff} onClick={() => act("handoff")}>Acknowledge shop-floor handoff</button><button onClick={() => act("scan-current")}>Try current identifier</button>{release.target === "B" && <button onClick={() => act("scan-old")}>Try revision A identifier</button>}</div><WhyThisExists>The source scanner blocks superseded identifiers and points to the current revision. These buttons simulate that outcome; no camera, barcode service, or production event is connected. Handoff acknowledgment is a proposed demo step.</WhyThisExists></section>
    </div><aside className={styles.panel}><h2>Practice history</h2><p>Session-only sequence. No real people or production records.</p><ol>{release.history.map((event, index) => <li key={index} className="mb-3"><strong>{index + 1}.</strong> {event}</li>)}</ol><a href="#demo-boundary">What is implemented vs. proposed?</a></aside></div>
    <section id="demo-boundary" className={styles.panel} style={{ marginTop: 24 }}><h2>Understand the boundary</h2><p><strong>Grounded in inspected source:</strong> revision approval, current/superseded revision state, and obsolete-identifier blocking.</p><p><strong>Proposed demo extensions:</strong> the affected-work plan, drawing/readiness gates, hold clarification, and explicit shop-floor acknowledgment. These steps demonstrate an approach, not a completed client integration.</p><p><strong>Isolated simulation:</strong> no database, uploads, operational APIs, real signatures, or multi-user synchronization. Reload, reset, scenario selection, or 30 minutes restores fictional fixtures. No measured business outcomes are claimed.</p><a href={manifest.caseStudyUrl}>Explore the problem and proposed approach ↗</a></section>
  </div>;
}
