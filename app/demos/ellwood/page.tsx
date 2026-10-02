import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { ellwoodWalkthroughSteps } from "@/lib/ellwood-walkthrough";

export const metadata: Metadata = {
  title: "Ellwood Flow walkthrough | Yorkstead",
  description: "Follow a manufacturing release from controlled revision to shop-floor scan, inspection and pallet plan, using screens from the Ellwood Flow prototype.",
  alternates: { canonical: "/demos/ellwood" },
  robots: { index: false, follow: false },
};

export default function EllwoodWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="Ellwood Flow, step by step"
      intro="A manufacturing release moves from the office to the shop floor and out the door. Here is that path in five screens, with the current revision and its status visible at each point."
      note="These are screens from the working prototype, run with example jobs and panel marks. Ellwood Flow is a concept inspired by past workplace experience, not a system adopted by that employer, and it has not been measured in a live shop."
      steps={ellwoodWalkthroughSteps}
      cta={{
        heading: "Want this on your own shop floor?",
        body: "We build release control around how your shop already works, and you own the result.",
        inquiryLabel: "Talk about your shop",
        inquiryHref: "/#contact",
        caseStudyHref: "/work/ellwood-flow",
      }}
    />
  );
}
