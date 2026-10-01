// Everything the design system bundle exposes as window.Yorkstead.
// Adding a component: export it here, add it to COMPONENTS in build.mjs,
// and give it source/components/<Name>/README.md + preview.html.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BrandMark, BrandLogo } from "@/components/brand-mark";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrintButton } from "@/components/print-button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";
import { WorkflowLeadForm } from "@/components/workflow-lead-form";
import { CaseStudyCard } from "@/components/case-study-card";
import { SolutionCard } from "@/components/solution-card";
import { DemoCard } from "@/components/demo-card";
import { LabExperimentCard } from "@/components/lab-experiment-card";
import { EngagementPricing } from "@/components/engagement-pricing";
import { ProjectStatusLegend } from "@/components/project-status-legend";
import { FounderIntroduction } from "@/components/founder-introduction";
import { PaginationControls } from "@/components/pagination-controls";
import { caseStudies } from "@/lib/case-studies";
import { publicSolutions } from "@/lib/solutions";
import { publicDemos } from "@/lib/demos";
import { publicLabExperiments } from "@/lib/labs";
import { ArrowRight, Check, MoveUpRight, Send } from "lucide-react";

window.Yorkstead = {
  Button, Badge, Card, CardContent, Input, Textarea, Label, BrandMark, BrandLogo, ProjectStatusBadge, ThemeToggle, PrintButton,
  SiteHeader, SiteFooter, ContactForm, WorkflowLeadForm, CaseStudyCard, SolutionCard, DemoCard, LabExperimentCard,
  EngagementPricing, ProjectStatusLegend, FounderIntroduction, PaginationControls,
  // The site's own content, so previews render real cards.
  data: { caseStudies, publicSolutions, publicDemos, publicLabExperiments },
  icons: { ArrowRight, Check, MoveUpRight, Send },
};
