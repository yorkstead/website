// Yorkstead Systems — component props (documentation). Sources: components/ui/*, components/*.tsx, data shapes from lib/*.ts.
// Runtime: window.Yorkstead.<Component>; window.Yorkstead.data holds the site content; window.Yorkstead.icons a few lucide icons.
import type * as React from "react";

/** components/ui/button.tsx — cva variants; `asChild` renders the child via Radix Slot (e.g. a Next <Link>). */
export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  asChild?: boolean;
}
export declare function Button(props: ButtonProps): React.JSX.Element;

/** components/ui/badge.tsx — `outline` is the bare bordered pill; pass colour classes via className. */
export interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: "outline" | "secondary";
}
export declare function Badge(props: BadgeProps): React.JSX.Element;

/** components/ui/card.tsx */
export type CardProps = React.ComponentProps<"div">;
export declare function Card(props: CardProps): React.JSX.Element;
export type CardContentProps = React.ComponentProps<"div">;
export declare function CardContent(props: CardContentProps): React.JSX.Element;

/** components/ui/input.tsx */
export type InputProps = React.ComponentProps<"input">;
export declare function Input(props: InputProps): React.JSX.Element;

/** components/ui/textarea.tsx */
export type TextareaProps = React.ComponentProps<"textarea">;
export declare function Textarea(props: TextareaProps): React.JSX.Element;

/** components/ui/label.tsx */
export type LabelProps = React.ComponentProps<"label">;
export declare function Label(props: LabelProps): React.JSX.Element;

/** components/brand-mark.tsx — links to "/" with the logo, wordmark and (xl+) descriptor. */
export interface BrandMarkProps {
  showDescriptor?: boolean;
  className?: string;
}
export declare function BrandMark(props: BrandMarkProps): React.JSX.Element;
export interface BrandLogoProps {
  className?: string;
  /** px, default 22 */
  size?: number;
}
export declare function BrandLogo(props: BrandLogoProps): React.JSX.Element;

/** components/project-status-badge.tsx — lib/project-status.ts */
export type ProjectStatus = "Live system" | "In development" | "Concept prototype" | "Previously used";
export interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}
export declare function ProjectStatusBadge(props: ProjectStatusBadgeProps): React.JSX.Element;

/** components/theme-toggle.tsx */
export declare function ThemeToggle(): React.JSX.Element;
/** components/print-button.tsx */
export declare function PrintButton(): React.JSX.Element;

/** components/site-header.tsx — sticky header with BrandMark, demo link, ThemeToggle and nav dropdown. */
export type SiteHeaderProps = Record<string, never>;
export declare function SiteHeader(props: SiteHeaderProps): React.JSX.Element;
/** components/site-footer.tsx */
export interface SiteFooterProps { children?: React.ReactNode }
export declare function SiteFooter(props: SiteFooterProps): React.JSX.Element;

/** components/contact-form.tsx — posts to the submitContact server action (a no-op stand-in in previews). */
export type ContactFormProps = Record<string, never>;
export declare function ContactForm(props: ContactFormProps): React.JSX.Element;
/** components/workflow-lead-form.tsx — posts to submitWorkflowLead (a no-op stand-in in previews). */
export type WorkflowLeadFormProps = Record<string, never>;
export declare function WorkflowLeadForm(props: WorkflowLeadFormProps): React.JSX.Element;

/** lib/case-studies.ts (abridged) */
export interface CaseStudy { slug: string; number: string; status: ProjectStatus; title: string; kicker: string; summary: string; signal: string; icon: "gauge" | "scan-line" | "layers"; industries: string[]; media: unknown[]; previewMediaId?: string; [key: string]: unknown }
/** components/case-study-card.tsx */
export interface CaseStudyCardProps { study: CaseStudy }
export declare function CaseStudyCard(props: CaseStudyCardProps): React.JSX.Element;

/** lib/solutions.ts */
export interface SolutionOutcome { slug: string; number: string; title: string; kicker: string; coreProblem: string; operationalBottleneck: string; howWeSolveIt: string; composableCapabilities: string[]; demoSlug?: string; demoUrl?: string; status: "Available in live demo" | "Custom engagement capability"; diagnosticFocus: string }
/** components/solution-card.tsx */
export interface SolutionCardProps { solution: SolutionOutcome }
export declare function SolutionCard(props: SolutionCardProps): React.JSX.Element;

/** lib/demos.ts */
export interface PublicDemo { slug: string; number: string; title: string; industry: string; kicker: string; summary: string; operationalProblem: string; solutionNarrative: string; workflowsShown: string[]; maturity: "Interactive Production Sandbox" | "Beta Interactive Sandbox"; dataDisclaimer: string; canonicalLaunchUrl: string; metrics: { label: string; value: string }[]; stages: string[] }
/** components/demo-card.tsx */
export interface DemoCardProps { demo: PublicDemo }
export declare function DemoCard(props: DemoCardProps): React.JSX.Element;

/** lib/labs.ts */
export interface LabExperiment { slug: string; number: string; title: string; category: string; kicker: string; maturity: "Functional Prototype" | "Browser-Runnable Slice" | "Hardware Lab Benchmark" | "Archived Spike"; status: "active_experiment" | "runnable_prototype" | "archived"; purpose: string; operationalHypothesis: string; limitations: string; dataSource: string; interactionType: string; interactionUrl?: string; technologies: string[]; findings: string[] }
/** components/lab-experiment-card.tsx */
export interface LabExperimentCardProps { experiment: LabExperiment }
export declare function LabExperimentCard(props: LabExperimentCardProps): React.JSX.Element;

/** components/engagement-pricing.tsx — content from lib/engagements.ts */
export type EngagementPricingProps = Record<string, never>;
export declare function EngagementPricing(props: EngagementPricingProps): React.JSX.Element;
/** components/project-status-legend.tsx */
export type ProjectStatusLegendProps = Record<string, never>;
export declare function ProjectStatusLegend(props: ProjectStatusLegendProps): React.JSX.Element;
/** components/founder-introduction.tsx */
export type FounderIntroductionProps = Record<string, never>;
export declare function FounderIntroduction(props: FounderIntroductionProps): React.JSX.Element;

/** lib/pagination.ts */
export interface Pagination { page: number; pageSize: number; total: number; totalPages: number; from: number; to: number; hasPrevious: boolean; hasNext: boolean }
/** components/pagination-controls.tsx */
export interface PaginationControlsProps { pagination: Pagination; previousHref: string | null; nextHref: string | null; noun: string }
export declare function PaginationControls(props: PaginationControlsProps): React.JSX.Element;
