"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { trackConversionEvent } from "@/components/conversion-tracker";
import { workflowRescueQuestions, workflowRescueResult, workflowRescueScore } from "@/lib/workflow-rescue-score";
import { cn } from "@/lib/utils";

export function WorkflowRescueCheck() {
  const [answers, setAnswers] = useState<Array<number | null>>(() => workflowRescueQuestions.map(() => null));
  const started = useRef(false);
  const completed = useRef(false);
  const answered = answers.filter((answer): answer is number => answer !== null);
  const isComplete = answered.length === workflowRescueQuestions.length;
  const score = workflowRescueScore(answered);
  const result = isComplete ? workflowRescueResult(score) : null;

  const choose = (questionIndex: number, value: number) => {
    if (!started.current) {
      started.current = true;
      trackConversionEvent("workflow_rescue_check_start");
    }
    const next = answers.map((answer, index) => index === questionIndex ? value : answer);
    setAnswers(next);
    if (!completed.current && next.every((answer) => answer !== null)) {
      completed.current = true;
      const completedScore = workflowRescueScore(next as number[]);
      trackConversionEvent("workflow_rescue_check_complete", {
        band: workflowRescueResult(completedScore).band,
      });
    }
  };

  const reset = () => {
    setAnswers(workflowRescueQuestions.map(() => null));
    started.current = false;
    completed.current = false;
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Two-minute bottleneck check</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Is the workflow worth fixing?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose the closest answer. This quick check stays in your browser and asks for no business or personal information.</p>
        </div>
        <div className="shrink-0 font-mono text-xs text-muted-foreground">{answered.length} / {workflowRescueQuestions.length} answered</div>
      </div>

      <div className="mt-6 space-y-5">
        {workflowRescueQuestions.map((question, questionIndex) => (
          <fieldset key={question.id} className="rounded-xl border border-border bg-background/45 p-4 sm:p-5">
            <legend className="px-1 text-sm font-medium sm:text-base">
              <span className="mr-2 font-mono text-[10px] text-primary">0{questionIndex + 1}</span>
              {question.prompt}
            </legend>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {question.options.map((option) => {
                const selected = answers[questionIndex] === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => choose(questionIndex, option.value)}
                    className={cn(
                      "flex min-h-16 items-start gap-3 rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/45 hover:bg-primary/5",
                    )}
                  >
                    <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span>
                      <span className="block text-xs font-medium">{option.label}</span>
                      <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{option.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {result ? (
        <div role="status" aria-live="polite" className="mt-6 grid gap-5 rounded-xl border border-primary/30 bg-primary/10 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
          <div className="grid size-14 place-items-center rounded-full border border-primary/30 bg-background font-mono text-lg font-semibold text-primary">{score}</div>
          <div>
            <div className="text-lg font-semibold">{result.title}</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{result.summary}</p>
            <p className="mt-2 text-xs font-medium text-foreground">Recommended next step: {result.nextStep}</p>
          </div>
          <a href="#audit-intake" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Discuss this workflow <ArrowRight className="size-4" />
          </a>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Answer all five questions to see the recommendation.
        </div>
      )}

      {answered.length > 0 ? (
        <button type="button" onClick={reset} className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground">
          <RotateCcw className="size-3.5" /> Reset answers
        </button>
      ) : null}
    </div>
  );
}
