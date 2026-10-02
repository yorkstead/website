"use client";

import { useState } from "react";
import { useDemoExpiry } from "./use-demo-expiry";
import { DemoControls, WhyThisExists } from "./demo-controls";
import { getScenario, reworkManifest, scenarios } from "@/lib/public-demo/rework/manifest";
import { completionBlocker, jobTotal, seedJob, transition, type Action, type DemoJob } from "@/lib/public-demo/rework/workflow";
import { RATES } from "@/lib/public-demo/rework/source-pricing";
import styles from "./demo-shell.module.css";

type View = "Arrival" | "Dock" | "Office" | "Architecture";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const guideSteps: { title: string; view: View; instruction: string }[] = [
  { title: "Make the arrival promise visible", view: "Arrival", instruction: "Review the requested count and hold. Confirm arrival; for a late load, recheck availability first." },
  { title: "Capture facts at the dock", view: "Dock", instruction: "Attach illustrated before evidence, review any quantity or damage exception, then add after evidence and synthetic sign-off. Complete the office handoff. In the refusal scenario, record refusal first and inspect the hold." },
  { title: "Let billing inherit the work", view: "Office", instruction: "Inspect the itemized total and job history. Prepare the demo invoice once the handoff is complete. Nothing is sent or charged." },
  { title: "Understand the boundary", view: "Architecture", instruction: "Read what is reused from the source and what this demo adds. Reset or choose another scenario to explore the next exception." },
];

function Evidence({ after, attached, damaged }: { after?: boolean; attached: boolean; damaged: boolean }) {
  return <figure>
    <svg viewBox="0 0 260 130" role="img" aria-label={`${after ? "After" : "Before"} pallet illustration${damaged && !after ? " with damaged runner" : ""}`}>
      <path d="M20 110H240" stroke="#819a8f" strokeWidth="2" />
      {[0, 1, 2].map((row) => [0, 1, 2].map((col) => <rect key={`${row}-${col}`} x={55 + col * 48 + (!after && row === 0 ? 14 : 0)} y={22 + row * 23} width="44" height="21" rx="2" fill={attached ? (after ? "#81af99" : "#d9b98a") : "#ced7cd"} stroke="#466c5e" />))}
      <path d={damaged && !after ? "M52 101H103L110 111L123 98H206" : "M52 101H206"} stroke="#806247" strokeWidth="8" />
    </svg>
    <figcaption><strong>{after ? "After work" : "On arrival"}</strong> · {attached ? "Attached" : "Not attached"}<br />Synthetic illustration; not a customer photo.</figcaption>
  </figure>;
}

function Invoice({ job }: { job: DemoJob }) {
  const rows = [
    ["Pallets", job.palletsCount, RATES.pallets], ["Wrap", job.wrapCount, RATES.wrap],
    ["Corner protectors", job.cornersCount, RATES.corners], ["Labor hours", job.laborHours, RATES.labor],
    ["Scale check", Number(job.scaleCheck), RATES.scale], ["Debris handling", Number(job.debrisFee), RATES.debris],
  ] as const;
  return <><table className={styles.table}><caption>Illustrative charges · {job.id}</caption><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Amount</th></tr></thead><tbody>{rows.map(([label, count, rate]) => <tr key={label}><th scope="row">{label}<div className={styles.small}>{money(rate)} each</div></th><td>{count}</td><td>{money(count * rate)}</td></tr>)}</tbody></table><p className={styles.total} data-testid="invoice-total">{money(jobTotal(job))}</p><p className={styles.small}>Sample source rates, not a quote. No tax, payment processing, accounting export, or invoice transmission.</p></>;
}

export function ReworkDemo({ initialScenario, initialGuided = false }: { initialScenario?: string; initialGuided?: boolean }) {
  const [job, setJob] = useState(() => seedJob(initialScenario));
  const [view, setView] = useState<View>(getScenario(initialScenario).id === "completed-invoice" ? "Office" : "Arrival");
  const [guided, setGuided] = useState(initialGuided);
  const [step, setStep] = useState(getScenario(initialScenario).id === "completed-invoice" ? 2 : 0);
  const [message, setMessage] = useState("Your private practice session is ready.");
  const [generation, setGeneration] = useState(0);
  const scenario = getScenario(job.scenarioId);
  const blocker = completionBlocker(job);

  useDemoExpiry(reworkManifest.resetAfterMs, `${job.scenarioId}:${generation}`, () => {
    setJob(seedJob(job.scenarioId)); setView(job.scenarioId === "completed-invoice" ? "Office" : "Arrival");
    setStep(job.scenarioId === "completed-invoice" ? 2 : 0);
    setMessage("The 30-minute practice session expired and was reset to synthetic fixtures.");
    setGeneration(value => value + 1);
  });

  function reset(id = job.scenarioId) {
    const selected = getScenario(id);
    setJob(seedJob(selected.id)); setView(selected.id === "completed-invoice" ? "Office" : "Arrival");
    setStep(selected.id === "completed-invoice" ? 2 : 0); setGeneration((value) => value + 1);
    setMessage(`${selected.title} reset. All previous practice changes were discarded.`);
  }
  function act(action: Action) {
    const result = transition(job, action); setJob(result.job); setMessage(result.message);
    if (result.ok && action.type === "arrive") { setView("Dock"); setStep(1); }
    if (result.ok && action.type === "complete") { setView("Office"); setStep(2); }
  }
  function navigateGuide(next: number) { setStep(next); setView(guideSteps[next].view); }
  const active = job.stage === "In Progress";

  return <div className={styles.root}>
    <DemoControls manifest={reworkManifest} scenarios={scenarios} scenarioId={scenario.id} guided={guided}
      onScenario={(id) => reset(getScenario(id).id)} onReset={() => reset()}
      onGuide={() => { setGuided(!guided); if (!guided) navigateGuide(job.stage === "Billed" || job.stage === "Completed" ? 2 : active ? 1 : 0); }} />
    <header className={styles.hero}><div><div className={styles.eyebrow}>Juniper Freight Lab / A fictional operation</div><h1>Every handoff.<br />One load record.</h1><p>{reworkManifest.description}</p></div><div className={styles.signal}><strong>Rework Flow by Yorkstead</strong><p>Arrival → Dock → Evidence → Office → Invoice</p><p className={styles.small}>Interactive workflow simulation. No customer systems connected.</p></div></header>
    <section aria-label="Selected scenario" className={styles.panel}><div className={styles.eyebrow}>Your scenario</div><h2>{scenario.title}</h2><p>{scenario.summary}</p><WhyThisExists>{scenario.why}</WhyThisExists></section>
    {guided && <section className={styles.guide} aria-label="Guided walkthrough"><div className={styles.eyebrow}>Guided walkthrough · {step + 1} / {guideSteps.length}</div><h2>{guideSteps[step].title}</h2><p>{guideSteps[step].instruction}</p><div className={styles.actions}><button disabled={step === 0} onClick={() => navigateGuide(step - 1)}>Previous step</button><button disabled={step === guideSteps.length - 1} onClick={() => navigateGuide(step + 1)}>Next step</button></div></section>}
    <nav className={styles.tabs} aria-label="Demo workspaces">{(["Arrival", "Dock", "Office", "Architecture"] as const).map((tab) => <button key={tab} aria-pressed={view === tab} onClick={() => { setView(tab); setStep(guideSteps.findIndex((entry) => entry.view === tab)); }}>{tab}</button>)}</nav>
    <p role="status" aria-live="polite" className={styles.status}>{message}</p>
    <div className={styles.grid}><div>
      {view === "Arrival" && <section className={styles.panel}><div className={styles.eyebrow}>01 / Driver & dispatch</div><h2>The load has a place to start.</h2><dl className={styles.meta}><div><dt>Carrier</dt><dd>{job.carrier}</dd></div><div><dt>Driver</dt><dd>{job.driver}</dd></div><div><dt>Trailer</dt><dd>{job.trailer}</dd></div><div><dt>Requested work</dt><dd>{job.expectedPallets} shifted pallets</dd></div><div><dt>Bay hold</dt><dd>{job.bay} · {job.holdMinutes} minutes</dd></div><div><dt>Scenario arrival clock</dt><dd>{job.elapsedMinutes} minutes after reservation</dd></div></dl>{job.elapsedMinutes >= job.holdMinutes && job.stage === "Reserved" && <p className={styles.notice}>Hold expired. The original bay promise must be checked again.</p>}<div className={styles.actions}><button className={styles.primary} disabled={job.stage !== "Reserved"} onClick={() => act({ type: "arrive" })}>Confirm arrival</button>{job.elapsedMinutes >= job.holdMinutes && <button disabled={job.stage !== "Reserved"} onClick={() => act({ type: "renew" })}>Recheck bay availability</button>}</div><p className={styles.small}>The arrival clock and available Bay 3 are deliberate scenario fixtures, not a live capacity feed.</p><WhyThisExists>A timed reservation makes the driver promise visible to dispatch. The source uses six bays and a 45-minute hold; this demo isolates one load to make the handoff easy to explore.</WhyThisExists></section>}
      {view === "Dock" && <section className={styles.panel}><div className={styles.eyebrow}>02 / Dock operator</div><h2>Record what actually happened.</h2>{!active && <p className={styles.notice}>{job.stage === "Reserved" ? "Confirm arrival to enable dock actions." : "This job is closed for editing. Reset to explore another outcome."}</p>}<dl className={styles.meta}><div><dt>Intake count</dt><dd>{job.expectedPallets} pallets</dd></div><div><dt>Actual count</dt><dd>{job.palletsCount} pallets</dd></div></dl><label htmlFor="pallet-count">Actual pallets handled</label><div className={styles.actions}><input id="pallet-count" type="number" min="0" max="100" step="1" value={job.palletsCount} disabled={!active} onChange={(event) => act({ type: "quantity", value: event.target.value === "" ? NaN : Number(event.target.value) })} /><button disabled={!active || job.quantityReviewed || job.palletsCount === job.expectedPallets} onClick={() => act({ type: "review-quantity" })}>Acknowledge quantity adjustment</button></div>{job.palletsCount !== job.expectedPallets && <p className={styles.notice}>{job.quantityReviewed ? "Quantity adjustment acknowledged." : "Quantity difference requires review."} Requested {job.expectedPallets}; actual {job.palletsCount}.</p>}
        <div className={styles.evidence}><Evidence attached={job.before} damaged={scenario.id === "damaged-material"} /><Evidence after attached={job.after} damaged={false} /></div><div className={styles.actions}><button disabled={!active || job.before} onClick={() => act({ type: "before" })}>Attach before evidence</button><button disabled={!active || job.after || !job.before} onClick={() => act({ type: "after" })}>Attach after evidence</button></div>
        {scenario.id === "damaged-material" && <div className={styles.notice}><p>Arrival condition: two broken pallet runners. {job.damageReviewed ? "Acknowledged." : "Review required."}</p><button disabled={!active || !job.before || job.damageReviewed} onClick={() => act({ type: "review-damage" })}>Acknowledge arrival damage</button></div>}
        <h3>Driver sign-off: {job.signature}</h3><div className={styles.actions}>{scenario.id === "signature-refusal" && <button disabled={!active || job.signature !== "pending"} onClick={() => act({ type: "refuse" })}>Record signature refusal</button>}<button disabled={!active || !job.before || !job.after || job.signature === "signed"} onClick={() => act({ type: "sign" })}>{job.signature === "refused" ? "Simulate driver returning to sign" : "Add synthetic driver sign-off"}</button></div><p className={styles.small}>This is a simulated acknowledgment, not a captured or legally binding signature.</p>{active && blocker && <p className={styles.notice}>{blocker}</p>}<div className={styles.actions}><button className={styles.primary} disabled={!active} onClick={() => act({ type: "complete" })}>Complete office handoff</button></div><WhyThisExists>The source connects counts, condition photos, and signature to one job. This teaching layer adds visible quantity and damage review gates; the client application is unchanged.</WhyThisExists></section>}
      {view === "Office" && <section className={styles.panel}><div className={styles.eyebrow}>03 / Office & billing</div><h2>{job.stage === "Billed" ? "Demo invoice prepared." : "An invoice you can explain."}</h2><p>{job.stage === "Billed" ? "DEMO ONLY · No money collected or invoice sent." : "Review the work record before preparing the demo invoice."}</p><Invoice job={job} /><div className={styles.actions}><button className={styles.primary} disabled={job.stage !== "Completed"} onClick={() => act({ type: "invoice" })}>Prepare demo invoice</button></div>{job.stage !== "Billed" && job.stage !== "Completed" && <p className={styles.notice}>Billing is blocked until the dock handoff is complete. {active ? blocker : "The load has not arrived."}</p>}<WhyThisExists>The same material and labor counts produce the office total. The public demo reuses the source calculation and sample rates, with no accounting adapter or payment gateway.</WhyThisExists></section>}
      {view === "Architecture" && <section className={styles.panel}><div className={styles.eyebrow}>04 / How it works</div><h2>Preserve the workflow. Isolate the demonstration.</h2><ol className={styles.steps}><li><strong>Fictional configuration.</strong> Product manifest, six scenario fixtures, and a scoped visual theme identify this public environment.</li><li><strong>Pure workflow model.</strong> Commands enforce demo handoffs. The pricing calculation is a traceable snapshot of Rework Flow source logic.</li><li><strong>Page-local state.</strong> Each page owns its job. Reload, reset, or the 30-minute timer restores fixtures. There is no shared tenant database.</li><li><strong>No client adapters.</strong> No customer data, file uploads, camera, GPS, email, billing transmissions, or production API calls.</li><li><strong>Reusable presentation.</strong> The banner, scenario controls, guided entry, and explanations can wrap a separate 240 Union model later.</li></ol><p className={styles.notice}>This demonstrates workflow design. It does not establish multi-device synchronization, production readiness, immutable audit records, or measured customer outcomes.</p><p><a href={`${reworkManifest.caseStudyUrl}#architecture`}>Read the architecture case study ↗</a></p></section>}
    </div><aside aria-label="Current job record"><section className={styles.panel}><div className={styles.eyebrow}>One shared record / within this page</div><h2>{job.id}</h2><dl className={styles.meta}><div><dt>Status</dt><dd data-testid="job-stage">{job.stage}</dd></div><div><dt>Assigned bay</dt><dd>{job.bay}</dd></div><div><dt>Evidence</dt><dd>{Number(job.before) + Number(job.after)} / 2 attached</dd></div><div><dt>Sign-off</dt><dd>{job.signature}</dd></div></dl><div className={styles.total}>{money(jobTotal(job))}</div><p className={styles.small}>Illustrative running total</p></section><section className={styles.panel}><h3>Practice job history</h3><ol className={styles.ledger}>{job.events.map((event, index) => <li key={`${index}-${event}`}>{event}</li>)}</ol><p className={styles.small}>Session-only event history; resets with the scenario.</p></section></aside></div>
  </div>;
}
