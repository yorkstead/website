export const workflowRescueQuestions = [
  {
    id: "reentry",
    prompt: "How often is the same job information entered more than once?",
    options: [
      { label: "Rarely", detail: "One dependable record", value: 0 },
      { label: "Sometimes", detail: "A few manual handoffs", value: 1 },
      { label: "Constantly", detail: "Email, paper, and spreadsheets disagree", value: 2 },
    ],
  },
  {
    id: "visibility",
    prompt: "How does someone find the current status of a job?",
    options: [
      { label: "One live view", detail: "The answer is visible", value: 0 },
      { label: "Check a few places", detail: "Usually reconstructable", value: 1 },
      { label: "Ask around", detail: "Status lives with people", value: 2 },
    ],
  },
  {
    id: "handoffs",
    prompt: "What happens when work changes hands?",
    options: [
      { label: "Clear handoff", detail: "Owner and next step are explicit", value: 0 },
      { label: "Mixed", detail: "Some steps rely on follow-up", value: 1 },
      { label: "Tribal knowledge", detail: "The right person has to remember", value: 2 },
    ],
  },
  {
    id: "exceptions",
    prompt: "Where do missing information and unusual jobs go?",
    options: [
      { label: "Visible queue", detail: "Exceptions have an owner", value: 0 },
      { label: "Messages and notes", detail: "Recovery depends on follow-up", value: 1 },
      { label: "They disappear", detail: "Problems surface when work is late", value: 2 },
    ],
  },
  {
    id: "dependency",
    prompt: "How often must the owner or one key employee interpret the process?",
    options: [
      { label: "Rarely", detail: "The team can move work forward", value: 0 },
      { label: "Several times a week", detail: "Judgment is concentrated", value: 1 },
      { label: "Every day", detail: "The person is the system", value: 2 },
    ],
  },
] as const;

export type WorkflowRescueBand = "contained" | "drag" | "rescue";

export type WorkflowRescueResult = {
  band: WorkflowRescueBand;
  title: string;
  summary: string;
  nextStep: string;
};

export function workflowRescueScore(answers: readonly number[]) {
  return answers.reduce((total, answer) => total + Math.max(0, Math.min(2, answer)), 0);
}

export function workflowRescueResult(score: number): WorkflowRescueResult {
  if (score <= 3) {
    return {
      band: "contained",
      title: "The workflow looks mostly contained.",
      summary: "The operating record is reasonably clear. A full rescue may be premature unless one specific exception is expensive or risky.",
      nextStep: "Document the weakest handoff and measure it before replacing tools.",
    };
  }
  if (score <= 6) {
    return {
      band: "drag",
      title: "You have measurable workflow drag.",
      summary: "The process still moves, but people are carrying information between tools and reconstructing status more often than they should.",
      nextStep: "A focused review can identify the smallest handoff worth fixing first.",
    };
  }
  return {
    band: "rescue",
    title: "This is a strong Workflow Rescue candidate.",
    summary: "Repeated entry, invisible exceptions, or key-person dependency are making the team compensate for the system every day.",
    nextStep: "Map one real job from intake to completion before buying another general-purpose tool.",
  };
}
