// modules/demo/use-demo-controller.ts
"use client";

import { useState } from "react";
import { ProblemDemoModule } from "./domain/demo-module-types";

export function useDemoController(demoModule: ProblemDemoModule) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [liveState, setLiveState] = useState<Record<string, unknown>>(demoModule.initialState);

  const currentStep = demoModule.walkthroughSteps[currentStepIndex];

  function nextStep() {
    if (currentStepIndex < demoModule.walkthroughSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setLiveState((prev) => ({
        ...prev,
        ...demoModule.walkthroughSteps[nextIdx].stateDelta
      }));
    }
  }

  function previousStep() {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setLiveState((prev) => ({
        ...prev,
        ...demoModule.walkthroughSteps[prevIdx].stateDelta
      }));
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
    setLiveState(demoModule.initialState);
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
