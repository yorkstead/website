"use client";

import React, { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Monitor,
  Server,
  Printer,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitRestaurantTrial,
  type RestaurantTrialState,
} from "@/app/actions/restaurant-trial";
import {
  approximateSeatOptions,
  posTerminalCountOptions,
  kitchenSetupOptions,
  preferredTimingOptions,
} from "@/lib/restaurant-trial-intake";
import { cn } from "@/lib/utils";

const initialState: RestaurantTrialState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="min-h-11 w-full bg-primary font-medium text-primary-foreground transition hover:opacity-90 sm:w-auto"
      disabled={pending}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
      <span>{pending ? "Submitting request…" : "Request 14-Day Restaurant Trial"}</span>
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="font-mono text-xs text-red-500 dark:text-red-400">{message}</p>
  ) : null;
}

export function RestaurantTrialSection() {
  const [state, formAction] = useActionState(submitRestaurantTrial, initialState);
  const [activeTab, setActiveTab] = useState<"step1" | "step2">("step1");

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-16">
      {/* 3-Tier Model Header */}
      <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-2">
          <Layers className="size-3.5" />
          <span>Evaluation &amp; Deployment Model</span>
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Three clear layers. No forced cutovers.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          We separate exploratory software capability, hands-on dining room proof, and long-term production deployment into distinct operational phases.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/80 p-5 space-y-3">
            <div className="font-mono text-xs font-bold text-muted-foreground">01 · INTERACTIVE DEMO</div>
            <h3 className="font-semibold text-foreground text-lg">Explore Online Now</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Experience the full 240 Union concept POS, coursing state machine, 86 board, and shift book directly in your browser.
            </p>
            <div className="pt-2">
              <a
                href="https://240.yorkstead.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
              >
                <span>Launch live simulator</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-2 font-mono text-[9px] uppercase tracking-wider bg-primary/20 text-primary font-bold px-2 py-0.5 rounded">
              Primary Offer
            </div>
            <div className="font-mono text-xs font-bold text-primary">02 · ON-SITE TRIAL</div>
            <h3 className="font-semibold text-foreground text-lg">Run It for 14 Days</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Yorkstead brings configured demonstration hardware into your dining room and kitchen. Run it alongside your current POS during real service.
            </p>
            <div className="pt-2">
              <a
                href="#trial-intake"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
              >
                <span>Jump to trial intake</span>
                <ArrowRight className="size-3" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-5 space-y-3">
            <div className="font-mono text-xs font-bold text-muted-foreground">03 · FULL ROLLOUT</div>
            <h3 className="font-semibold text-foreground text-lg">Production Implementation</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              If the system proves itself, finalize commercial hardware ownership, wholesale interchange-plus merchant accounts, and staff training.
            </p>
            <div className="pt-2">
              <span className="font-mono text-xs text-muted-foreground">
                Decided after staff evaluation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Trial Section */}
      <section id="trial" className="scroll-mt-8 space-y-10 border-t border-border pt-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary font-bold">
            <ShieldCheck className="size-3.5" />
            <span>14-Day Risk-Free Restaurant Trial</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Don&apos;t buy it from a sales presentation. Run it for 14 days.
          </h2>

          <p className="text-lg sm:text-xl font-medium text-foreground/90 max-w-3xl">
            Real hardware. Real workflows. Your team. Your environment.
          </p>

          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">
            See how Yorkstead works during actual restaurant operations before committing to a full implementation. Rather than asking you to trust slideware or an online demo, we bring a configured working hardware kit into your restaurant and run it alongside your existing tools.
          </p>

          {/* Core Trial Principles Grid */}
          <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "No Long-Term Commitment",
                description:
                  "Evaluate the system with zero mandatory multi-year contracts. Final trial scope and hardware configuration are agreed before installation.",
              },
              {
                title: "Configured for Your Operation",
                description:
                  "We map your actual dining room floor plan, table sections, food and cocktail menus, and kitchen line routing.",
              },
              {
                title: "Yorkstead Supplies Hardware",
                description:
                  "We provide demonstration touchscreen terminals, kitchen display hardware, and local LAN appliances for the evaluation.",
              },
              {
                title: "Parallel Run Alongside Current POS",
                description:
                  "Never bet your dinner rush on a same-day cutover. Your existing POS remains the primary live system of record during testing.",
              },
              {
                title: "Evaluate During Real Service",
                description:
                  "Let your servers, bartenders, expediters, and closing managers touch it, ring orders, and test coursing under live volume.",
              },
              {
                title: "Decide After Staff Usage",
                description:
                  "Keep what works. Identify what needs adjustment. Make an informed rollout decision based on measured dining room evidence.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card p-4 space-y-1.5"
              >
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 5-Step Process */}
        <div className="space-y-6">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
            The 5-Step Trial Process
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: "01",
                title: "We Learn the Operation",
                detail:
                  "We review your floor structure, menu categories, kitchen line stations, current POS pain points, and private dining requirements.",
              },
              {
                step: "02",
                title: "We Configure the Trial",
                detail:
                  "We build a representative environment with your actual dining room tables, modifier trees, server sections, and manager rules.",
              },
              {
                step: "03",
                title: "We Bring the Hardware",
                detail:
                  "Yorkstead brings demonstration touchscreen terminals, kitchen display screens, and a local LAN server appliance into your building.",
              },
              {
                step: "04",
                title: "Parallel Evaluation",
                detail:
                  "Your team rings sample orders, tests 30-second speed-splits, and fires coursing passes alongside your existing system without risk.",
              },
              {
                step: "05",
                title: "Decide After 14 Days",
                detail:
                  "Review staff feedback, identify requested customizations, establish production scope, or simply return the demonstration kit.",
              },
            ].map((s) => (
              <article
                key={s.step}
                className="rounded-xl border border-border bg-card p-5 space-y-2 relative"
              >
                <div className="font-mono text-xs font-bold text-primary">{s.step}</div>
                <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Hardware Demonstration Positioning & Visual Placeholders */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-2">
              <Package className="size-3.5" />
              <span>Physical Demonstration Hardware Kit</span>
            </div>
            <h3 className="text-2xl font-semibold text-foreground">
              Yorkstead isn&apos;t just a browser mockup. We bring a working restaurant stack into the building.
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">
              Touch it. Ring orders into it. Send tickets through the kitchen. Let managers use it during service. Before replacing anything, prove the workflow.
            </p>
          </div>

          {/* Hardware Component Schematic Placeholders */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            {/* Component 1: Touchscreen POS Terminal */}
            <div className="group rounded-xl border border-border bg-background/80 p-5 space-y-3 transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Monitor className="size-6 text-primary" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded">
                  Demonstration Unit
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Touchscreen POS Terminal</h4>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">Commercial 15.6&quot; Spill-Resistant</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Capacitive glass touch terminal configured with seat-aware order entry, 30-second speed-splits, and rapid modifier routing.
              </p>
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-2.5 text-center font-mono text-[10px] text-muted-foreground/80">
                [ Hardware Kit Photo Slot · POS Station ]
              </div>
            </div>

            {/* Component 2: Kitchen Display Screen */}
            <div className="group rounded-xl border border-border bg-background/80 p-5 space-y-3 transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Cpu className="size-6 text-amber-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded">
                  Demonstration Unit
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Kitchen Display (KDS)</h4>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">High-Visibility 21.5&quot; Line Screen</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Coursing state machine pass with multi-station line filtering, real-time course readiness, and instant 86 board sync.
              </p>
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-2.5 text-center font-mono text-[10px] text-muted-foreground/80">
                [ Hardware Kit Photo Slot · Expo / KDS Pass ]
              </div>
            </div>

            {/* Component 3: Local Restaurant Server Appliance */}
            <div className="group rounded-xl border border-border bg-background/80 p-5 space-y-3 transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Server className="size-6 text-emerald-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded">
                  Local Appliance
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Yorkstead Server Appliance</h4>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">Commercial Fanless Mini-PC</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                In-house local database and state machine engine. Sub-5ms response time over LAN; immune to cloud internet outages.
              </p>
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-2.5 text-center font-mono text-[10px] text-muted-foreground/80">
                [ Hardware Kit Photo Slot · LAN Appliance ]
              </div>
            </div>

            {/* Component 4: Thermal Receipt & Ticket Printer */}
            <div className="group rounded-xl border border-border bg-background/80 p-5 space-y-3 transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Printer className="size-6 text-blue-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded">
                  Network Accessory
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Network Receipt Printer</h4>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">Standard ESC/POS Ethernet</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                High-speed thermal guest check printing. Uses standard network protocols to verify compatibility with existing drawer hardware.
              </p>
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-2.5 text-center font-mono text-[10px] text-muted-foreground/80">
                [ Hardware Kit Photo Slot · Receipt Printer ]
              </div>
            </div>
          </div>
        </div>

        {/* Trial Intake Form Card */}
        <div
          id="trial-intake"
          className="scroll-mt-8 rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-10 shadow-2xl space-y-8"
        >
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-2">
              <Sparkles className="size-3.5" />
              <span>Step-by-Step Trial Intake</span>
            </div>
            <h3 className="text-3xl font-semibold tracking-tight text-foreground">
              Request a 14-Day Restaurant Evaluation
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl">
              Tell us about your restaurant and operating setup. Brandon will review your workflow specifications and reach out to configure the demonstration environment.
            </p>
          </div>

          {state.status === "success" ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">
                    14-Day Evaluation Request Received
                  </h4>
                  <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    Application added to operational review queue
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {state.message}
              </p>
              <div className="pt-2 flex flex-wrap gap-4 items-center">
                <a
                  href="https://240.yorkstead.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90"
                >
                  <span>Explore Online Demo While You Wait</span>
                  <ExternalLink className="size-3" />
                </a>
                <Link
                  href="/work"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Return to Selected Work
                </Link>
              </div>
            </div>
          ) : (
            <form action={formAction} className="space-y-6" noValidate>
              {/* Tab Selector for Progressive Intake */}
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("step1")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                    activeTab === "step1"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  1. Contact &amp; Location
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("step2")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition",
                    activeTab === "step2"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  2. Operations &amp; Stations
                </button>
              </div>

              {/* Step 1 Fields */}
              <div className={cn("space-y-5", activeTab !== "step1" && "hidden")}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trial-restaurant">Restaurant / Group Name *</Label>
                    <Input
                      id="trial-restaurant"
                      name="restaurantName"
                      placeholder="e.g. Union Cellar &amp; Hearth"
                      required
                      aria-invalid={Boolean(state.errors?.restaurantName)}
                    />
                    <FieldError message={state.errors?.restaurantName} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-contact">Contact Name *</Label>
                    <Input
                      id="trial-contact"
                      name="contactName"
                      placeholder="e.g. Michael Thorne, General Manager"
                      required
                      aria-invalid={Boolean(state.errors?.contactName)}
                    />
                    <FieldError message={state.errors?.contactName} />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="trial-email">Email Address *</Label>
                    <Input
                      id="trial-email"
                      name="email"
                      type="email"
                      placeholder="gm@restaurant.com"
                      required
                      aria-invalid={Boolean(state.errors?.email)}
                    />
                    <FieldError message={state.errors?.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-phone">Phone Number</Label>
                    <Input
                      id="trial-phone"
                      name="phone"
                      type="tel"
                      placeholder="(303) 555-0192"
                      aria-invalid={Boolean(state.errors?.phone)}
                    />
                    <FieldError message={state.errors?.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-city">City &amp; State *</Label>
                    <Input
                      id="trial-city"
                      name="cityState"
                      placeholder="e.g. Lakewood, CO"
                      required
                      aria-invalid={Boolean(state.errors?.cityState)}
                    />
                    <FieldError message={state.errors?.cityState} />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("step2")}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-mono text-xs font-semibold text-foreground hover:bg-card transition"
                  >
                    <span>Next: Operational Profile</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Step 2 Fields */}
              <div className={cn("space-y-5", activeTab !== "step2" && "hidden")}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trial-seats">Approximate Seats / Capacity</Label>
                    <select
                      id="trial-seats"
                      name="approximateSeats"
                      defaultValue={approximateSeatOptions[1]}
                      className={selectClass}
                    >
                      {approximateSeatOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-terminals">Number of POS Terminals</Label>
                    <select
                      id="trial-terminals"
                      name="posTerminals"
                      defaultValue={posTerminalCountOptions[1]}
                      className={selectClass}
                    >
                      {posTerminalCountOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="trial-current-pos">Current POS System</Label>
                    <Input
                      id="trial-current-pos"
                      name="currentPos"
                      placeholder="e.g. Toast, Micros, Aloha, Clover"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-kitchen">Kitchen Setup</Label>
                    <select
                      id="trial-kitchen"
                      name="kitchenSetup"
                      defaultValue={kitchenSetupOptions[0]}
                      className={selectClass}
                    >
                      {kitchenSetupOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-events">Private Dining / Banquets?</Label>
                    <select
                      id="trial-events"
                      name="hasPrivateDining"
                      defaultValue="No"
                      className={selectClass}
                    >
                      <option value="No">No private dining</option>
                      <option value="Yes">Yes, private rooms / events</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial-pain-point">Biggest Operational Issue / Focus Area</Label>
                  <Input
                    id="trial-pain-point"
                    name="biggestPainPoint"
                    placeholder="e.g. Dinner rush screen lag, complex 8-way split checks, kitchen coursing timing, SaaS fee burden"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trial-timing">Preferred Trial Timing</Label>
                    <select
                      id="trial-timing"
                      name="preferredTiming"
                      defaultValue={preferredTimingOptions[0]}
                      className={selectClass}
                    >
                      {preferredTimingOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-notes">Additional Notes / Questions</Label>
                    <Textarea
                      id="trial-notes"
                      name="notes"
                      rows={2}
                      placeholder="Any specific station requirements, printer brands, or bar setups..."
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("step1")}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    ← Back to Contact &amp; Location
                  </button>
                </div>
              </div>

              {/* Honeypot field */}
              <div className="sr-only" aria-hidden="true">
                <Label htmlFor="trial-website">Website</Label>
                <Input id="trial-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {state.status === "error" && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-600 dark:text-red-400"
                >
                  {state.message}
                </div>
              )}

              {/* Accurate Risk-Free Terms Notice */}
              <div className="border-t border-border pt-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground/80 max-w-xl">
                  <strong>14-Day Risk-Free Evaluation:</strong> No long-term commitment. Final trial scope and hardware configuration are agreed before installation. Evaluated alongside your existing POS without disrupting current live service.
                </p>
                <SubmitButton />
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
