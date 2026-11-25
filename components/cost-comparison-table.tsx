"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const monthlyTiers = [500, 1000, 1500] as const;
const yorksteadPrice = 7500;

export function CostComparisonTable() {
  const [activeMonthly, setActiveMonthly] = useState<number | null>(null);
  const activeThreeYear = activeMonthly ? activeMonthly * 36 : null;
  const activeSavings = activeThreeYear ? activeThreeYear - yorksteadPrice : null;

  return (
    <div>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">
          Illustrative three-year cost of a monthly subscription compared with a one-time purchase
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 font-medium">Monthly software fees</th>
            <th scope="col" className="py-2 text-right font-medium">Over 3 years</th>
          </tr>
        </thead>
        <tbody>
          {monthlyTiers.map((monthly) => {
            const threeYear = monthly * 36;
            const isSelected = activeMonthly === monthly;
            const barWidth = Math.round((threeYear / (1500 * 36)) * 100);
            return (
              <tr
                key={monthly}
                tabIndex={0}
                onMouseEnter={() => setActiveMonthly(monthly)}
                onMouseLeave={() => setActiveMonthly(null)}
                onFocus={() => setActiveMonthly(monthly)}
                onBlur={() => setActiveMonthly(null)}
                className={cn(
                  "border-b border-border/60 outline-none transition-colors duration-150 ease-out focus-visible:bg-accent/60",
                  isSelected ? "bg-accent/50" : "hover:bg-accent/35",
                )}
              >
                <td className="py-3 pl-2 pr-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>${monthly.toLocaleString("en-US")} per month</span>
                    <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-border/60 sm:inline-block" aria-hidden="true">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-all duration-200 ease-out",
                          isSelected ? "bg-primary" : "bg-muted-foreground/45",
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-2 text-right font-medium tabular-nums">${threeYear.toLocaleString("en-US")}</td>
              </tr>
            );
          })}
          <tr className="transition-colors duration-150">
            <td className="py-3 pl-2 font-medium text-primary">A Yorkstead system</td>
            <td className="py-3 pr-2 text-right font-medium text-primary tabular-nums">$7,500 once</td>
          </tr>
        </tbody>
      </table>
      <div
        aria-live="polite"
        className={cn(
          "mt-2 min-h-5 font-mono text-[10px] tracking-wide text-primary transition-opacity duration-150 ease-out",
          activeSavings ? "opacity-100" : "opacity-0",
        )}
      >
        {activeSavings && activeMonthly
          ? `Illustrative 36-month difference vs. $${activeMonthly.toLocaleString("en-US")}/mo: $${activeSavings.toLocaleString("en-US")}`
          : "\u00a0"}
      </div>
    </div>
  );
}
