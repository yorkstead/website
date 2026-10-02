import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { freightFlowWalkthroughSteps } from "@/lib/freight-flow-walkthrough";

export const metadata: Metadata = {
  title: "FreightFlow walkthrough | Yorkstead",
  description: "Follow a freight brokerage exception from the morning overview to a ranked queue, a load, a customer update and the rules behind it, using screens from the FreightFlow prototype.",
  alternates: { canonical: "/demos/freight-flow" },
};

export default function FreightFlowWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="FreightFlow, step by step"
      intro="A freight brokerage already has a system for loads, quotes and invoices. FreightFlow sits beside it and answers what needs attention, who should act and whether it was resolved. Here is that path in six screens."
      note="These are screens from the working prototype, which runs on invented loads, carriers and people. It does not connect to a real transportation management system, and it has not been measured in a live brokerage."
      steps={freightFlowWalkthroughSteps}
      cta={{
        heading: "Want this beside your own TMS?",
        body: "We build exception handling around the systems you already run, and you own the result.",
        inquiryLabel: "Talk about your brokerage",
        inquiryHref: "/#contact",
        caseStudyHref: "/demos",
        caseStudyLabel: "See all demos",
      }}
    />
  );
}
