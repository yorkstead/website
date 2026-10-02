import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { reworkWalkthroughSteps } from "@/lib/rework-walkthrough";

export const metadata: Metadata = {
  title: "Rework Flow walkthrough | Yorkstead",
  description: "Follow a freight rework job from a driver's reservation to a signed completion packet, using screens from the real Rework Flow application.",
  alternates: { canonical: "/demos/rework" },
};

export default function ReworkWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="Rework Flow, step by step"
      intro="A freight load is rejected at a receiver and needs fixing at a dock. Here is that job from the driver's reservation to a signed packet the office can bill from, in seven screens."
      note="These are screens from the working application, run with a made-up company name and example loads. The software is in development and has not been measured in a live operation."
      steps={reworkWalkthroughSteps}
      cta={{
        heading: "Want this around your own dock?",
        body: "We build it to fit how your operation already works, and you own the result.",
        inquiryLabel: "Inquire about Rework Flow",
        inquiryHref: "/?product=rework-flow#contact",
        caseStudyHref: "/work/rework-flow",
      }}
    />
  );
}
