// components/demo/operational-scenario-display.tsx
"use client";

import React from "react";
import { ProblemDemoModule } from "@/lib/public-demo/scenarios/domain/demo-module-types";
import { useDemoController } from "@/lib/public-demo/scenarios/use-demo-controller";

interface OperationalScenarioDisplayProps {
  demoModule: ProblemDemoModule;
}

export function OperationalScenarioDisplay({ demoModule }: OperationalScenarioDisplayProps) {
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    liveState,
    nextStep,
    previousStep,
    executeTrigger,
    resetDemo,
    triggers,
  } = useDemoController(demoModule);

  const isLocked = Boolean(
    liveState.interlockActive ||
      liveState.shortageFlagActive ||
      liveState.stagingStatus === "SHORTAGE_LOCKED" ||
      liveState.posOrderingStatus === "LOCKED_86" ||
      liveState.machineStatus === "LOCKED_OUT"
  );

  return (
    <div className="space-y-6 text-zinc-100 font-sans">
      {/* 1. Header & Financial/Operational Impact Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                {demoModule.industry}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              {demoModule.title}
            </h1>
          </div>

          {/* Financial Risk Exposure Badge */}
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-2.5 text-left md:text-right">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-red-400">
              Annual Financial Exposure
            </span>
            <span className="text-sm font-semibold text-red-200">
              {demoModule.annualScrapOrLossRisk}
            </span>
          </div>
        </div>

        {/* Root Cause & Engineered Fix Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3.5">
            <span className="font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Rampant Failure Mode
            </span>
            <p className="text-zinc-300 leading-relaxed">{demoModule.rootCause}</p>
          </div>

          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3.5">
            <span className="font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Engineered Safeguards
            </span>
            <ul className="space-y-1 text-zinc-300">
              {demoModule.solutionBreakdown.map((point, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Main Operational Workspace: Walkthrough vs. Live Station Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Step Progression (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-lg">
          <div className="space-y-5">
            {/* Step Counter & Location */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded">
                SEQUENCE {currentStepIndex + 1} OF {totalSteps}
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                NODE: <strong className="text-zinc-200">{currentStep.stationOrRole}</strong>
              </span>
            </div>

            {/* Current Step Description */}
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {currentStep.title}
              </h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                <strong className="text-zinc-200 font-medium">Trigger Action: </strong>
                {currentStep.actionDescription}
              </p>
            </div>

            {/* Behavior & Saved Failure Card */}
            <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
              <div className="text-xs">
                <span className="font-mono font-semibold uppercase tracking-wider text-blue-400 block mb-0.5">
                  System Automated Reaction
                </span>
                <p className="text-zinc-300 leading-relaxed">{currentStep.systemBehavior}</p>
              </div>

              <div className="border-t border-zinc-800/80 pt-2.5 text-xs">
                <span className="font-mono font-semibold uppercase tracking-wider text-emerald-400 block mb-0.5">
                  Direct Failure Prevented
                </span>
                <p className="text-emerald-200/90 leading-relaxed font-medium">
                  {currentStep.failurePrevented}
                </p>
              </div>
            </div>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <button
              onClick={previousStep}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={resetDemo}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-wider transition"
            >
              Reset Cycle
            </button>
            <button
              onClick={nextStep}
              disabled={currentStepIndex === totalSteps - 1}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded bg-zinc-100 text-zinc-900 hover:bg-white transition font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next Action →
            </button>
          </div>
        </div>

        {/* Right Column: Live Station Terminal & Edge-Case Triggers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-lg">
          <div className="space-y-4">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isLocked ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                  Live Station Telemetry
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                  isLocked
                    ? "bg-red-950/60 text-red-300 border-red-800"
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                }`}
              >
                {isLocked ? "LOCKOUT ACTIVE" : "NOMINAL RUN"}
              </span>
            </div>

            {/* Formatted Operational Fields */}
            <div className="rounded-lg border border-zinc-800/80 bg-black/60 p-3.5 space-y-2.5 font-mono text-xs">
              {Object.entries(liveState).map(([key, value]) => {
                if (key === "alertMessage" || key === "activeAlert") return null;
                return (
                  <div key={key} className="flex justify-between items-center border-b border-zinc-900 pb-1 last:border-0 last:pb-0">
                    <span className="text-zinc-500 text-[11px]">{key}:</span>
                    <span
                      className={`font-semibold ${
                        value === true || value === "LOCKED_OUT" || value === "LOCKED_86"
                          ? "text-red-400"
                          : value === false || value === "READY_TO_RUN" || value === "AVAILABLE"
                          ? "text-emerald-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {String(value)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Visual Warning / Lock Banner */}
            {liveState.alertMessage ? (
              <div className="rounded-lg border border-red-800/80 bg-red-950/40 p-3 text-xs text-red-200 flex items-start gap-2">
                <span className="text-red-400 font-bold">⛔</span>
                <div>
                  <strong className="font-mono uppercase tracking-wider block text-red-300">
                    Interlock Tripped:
                  </strong>
                  <span className="mt-0.5 block leading-normal">{String(liveState.alertMessage)}</span>
                </div>
              </div>
            ) : null}

            {liveState.activeAlert ? (
              <div className="rounded-lg border border-amber-800/80 bg-amber-950/40 p-3 text-xs text-amber-200 flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <div>
                  <strong className="font-mono uppercase tracking-wider block text-amber-300">
                    Station Alert:
                  </strong>
                  <span className="mt-0.5 block leading-normal">{String(liveState.activeAlert)}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Interactive Failure Injection Triggers */}
          <div className="border-t border-zinc-800 pt-4 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
              Simulate Failure Conditions:
            </span>
            <div className="flex flex-col gap-2">
              {triggers.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() => executeTrigger(trigger.id)}
                  className={`text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1 ${
                    trigger.triggerType === "simulate_failure"
                      ? "border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-red-200"
                      : "border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-200"
                  }`}
                >
                  <span className="font-semibold font-mono tracking-wide flex items-center gap-1.5">
                    <span>{trigger.triggerType === "simulate_failure" ? "⚡" : "✓"}</span>
                    {trigger.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    {trigger.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
