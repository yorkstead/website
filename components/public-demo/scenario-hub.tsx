"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getAllDemoModules } from "@/lib/public-demo/scenarios/demo-registry";
import { OperationalScenarioDisplay } from "./scenario-display";

/** Older shared deep links use these names; only the manufacturing one has a matching walkthrough. */
const SCENARIO_ALIASES: Record<string, string> = { "front-range-manufacturing": "drawing-revision-barrier" };

export function ScenarioHub({ initialScenario }: { initialScenario?: string }) {
  const modules = getAllDemoModules();
  const requested = initialScenario ? SCENARIO_ALIASES[initialScenario] ?? initialScenario : undefined;
  const [selectedId, setSelectedId] = useState(modules.find((m) => m.slug === requested)?.id ?? modules[0]?.id);

  const activeModule = modules.find((m) => m.id === selectedId) ?? modules[0];

  return (
    <main className="min-h-screen bg-black py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto mb-4 text-sm"><Link href="/demos" className="text-zinc-400 hover:text-white">← All walkthroughs</Link></div>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Industry / Workflow Module Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedId(mod.id)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
                  mod.id === activeModule?.id
                    ? "bg-zinc-100 text-zinc-950 font-bold shadow"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {mod.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synthetic Sandbox Environment
            </span>
          </div>
        </div>

        {/* Render the Active Operational Scenario */}
        {activeModule ? (
          <OperationalScenarioDisplay key={activeModule.id} demoModule={activeModule} />
        ) : null}
      </div>
    </main>
  );
}
