// modules/demo/domain/demo-module-types.ts

export type IndustryCategory = "manufacturing" | "hospitality" | "logistics" | "field_service";

export interface DemoStep {
  stepNumber: number;
  title: string;
  stationOrRole: string;
  actionDescription: string;
  systemBehavior: string;
  failurePrevented: string;
  stateDelta: Record<string, unknown>;
}

export interface InteractiveTrigger {
  id: string;
  label: string;
  description: string;
  triggerType: "simulate_failure" | "apply_resolution" | "reset";
  resultingState: Record<string, unknown>;
}

export interface ProblemDemoModule {
  id: string;
  slug: string;
  category: IndustryCategory;
  title: string;
  industry: string;
  executiveSummary: string;
  annualScrapOrLossRisk: string;
  rootCause: string;
  solutionBreakdown: string[];
  initialState: Record<string, unknown>;
  walkthroughSteps: DemoStep[];
  triggers: InteractiveTrigger[];
}
