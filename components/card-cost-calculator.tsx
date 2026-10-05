"use client";

import { useId, useState } from "react";
import { namedSystemPrice } from "@/lib/contact-card";
import { cn } from "@/lib/utils";

const yearOptions = [3, 5, 10] as const;

function dollars(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function CardCostCalculator() {
  const inputId = useId();
  const [monthlyInput, setMonthlyInput] = useState("500");
  const [years, setYears] = useState<(typeof yearOptions)[number]>(5);

  const monthly = Math.max(0, Math.min(100000, Number(monthlyInput.replace(/[^\d.]/g, "")) || 0));
  const subscriptionTotal = monthly * 12 * years;
  const difference = subscriptionTotal - namedSystemPrice;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-primary">Run your own numbers</div>
      <label htmlFor={inputId} className="mt-3 block text-sm font-medium">What do you pay each month for the software you run on?</label>
      <div className="mt-2 flex items-center rounded-lg border border-border bg-background px-3 focus-within:border-primary">
        <span className="text-muted-foreground">$</span>
        <input
          id={inputId}
          inputMode="numeric"
          value={monthlyInput}
          onChange={(event) => setMonthlyInput(event.target.value)}
          className="h-11 w-full bg-transparent px-2 text-base outline-none"
          aria-describedby={`${inputId}-hint`}
        />
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted-foreground">Add up every tool: scheduling, inventory, POS, per-seat fees.</p>

      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Years to compare">
        {yearOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setYears(option)}
            aria-pressed={years === option}
            className={cn(
              "h-10 rounded-lg border text-sm transition",
              years === option ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option} years
          </button>
        ))}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
          <dt className="text-muted-foreground">Subscriptions over {years} years</dt>
          <dd className="text-lg font-semibold tabular-nums">{dollars(subscriptionTotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-primary">A Yorkstead system</dt>
          <dd className="text-lg font-semibold tabular-nums text-primary">{dollars(namedSystemPrice)} once</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-6" aria-live="polite">
        {difference > 0
          ? `That's ${dollars(difference)} more than buying once, and you'd still be renting.`
          : `At this spend, subscriptions cost less over ${years} years. If that's you, we'll say so.`}
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Illustration only. The $7,500 price applies to our two named systems, and what&apos;s included is defined in the proposal. Hosting and third-party services are listed separately, and optional support is extra.
      </p>
    </div>
  );
}
