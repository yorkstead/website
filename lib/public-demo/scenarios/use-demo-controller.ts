"use client";

import { useState } from "react";
import { ProblemDemoModule } from "./domain/demo-module-types";

/** State at a given step: the initial state with every step delta up to and including that step applied. */
export function stateAtStep(demoModule: ProblemDemoModule, stepIndex: number): Record<string, unknown> {
  return demoModule.walkthroughSteps
    .slice(0, stepIndex + 1)
    .reduce<Record<string, unknown>>((state, step) => ({ ...state, ...step.stateDelta }), { ...demoModule.initialState });
}

export function useDemoController(demoModule: ProblemDemoModule) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [liveState, setLiveState] = useState<Record<string, unknown>>(() => stateAtStep(demoModule, 0));

  const currentStep = demoModule.walkthroughSteps[currentStepIndex];

  function nextStep() {
    if (currentStepIndex < demoModule.walkthroughSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setLiveState(stateAtStep(demoModule, nextIdx));
    }
  }

  function previousStep() {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setLiveState(stateAtStep(demoModule, prevIdx));
    }
  }

  function executeTrigger(triggerId: string) {
    const trigger = demoModule.triggers.find((t) => t.id === triggerId);
    if (trigger) {
      setLiveState((prev) => ({
        ...prev,
        ...trigger.resultingState
      }));
    }
  }

  function resetDemo() {
    setCurrentStepIndex(0);
    setLiveState(stateAtStep(demoModule, 0));
  }

  return {
    currentStepIndex,
    currentStep,
    totalSteps: demoModule.walkthroughSteps.length,
    liveState,
    nextStep,
    previousStep,
    executeTrigger,
    resetDemo,
    triggers: demoModule.triggers
  };
}
