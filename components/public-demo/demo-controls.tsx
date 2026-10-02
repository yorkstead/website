"use client";

import type { PublicDemoManifest, PublicDemoScenario } from "@/lib/public-demo/types";

export function DemoControls({ manifest, scenarios, scenarioId, guided, onScenario, onReset, onGuide }: {
  manifest: PublicDemoManifest;
  scenarios: readonly PublicDemoScenario[];
  scenarioId: string;
  guided: boolean;
  onScenario: (id: string) => void;
  onReset: () => void;
  onGuide: () => void;
}) {
  return <>
    <div role="note" className="demo-banner">
      <strong>YORKSTEAD PUBLIC SANDBOX</strong>
      <span>Fictional company and data. Changes stay in this page and reset on reload or after {manifest.resetAfterMs / 60000} minutes.</span>
    </div>
    <div className="demo-controls">
      <div><label htmlFor={`${manifest.id}-scenario`}>Scenario</label><select id={`${manifest.id}-scenario`} value={scenarioId} onChange={(event) => onScenario(event.target.value)}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.title}</option>)}</select></div>
      <button type="button" onClick={onGuide} aria-pressed={guided}>{guided ? "Exit guided walkthrough" : "Start guided walkthrough"}</button>
      <button type="button" onClick={onReset}>Reset sandbox</button>
      <a href={manifest.caseStudyUrl}>Read the case study ↗</a>
    </div>
  </>;
}

export function WhyThisExists({ children }: { children: React.ReactNode }) {
  return <details className="demo-why"><summary>Why this exists</summary><p>{children}</p></details>;
}
