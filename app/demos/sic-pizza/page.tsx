import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { sicPizzaWalkthroughSteps } from "@/lib/sic-pizza-walkthrough";

export const metadata: Metadata = {
  title: "SIC Pizza restaurant operating system walkthrough | Yorkstead",
  description: "Follow one table through a restaurant operating system, from a guest's pizza proposal to the server, kitchen, expo and manager views, using screens from the SIC Pizza concept.",
  alternates: { canonical: "/demos/sic-pizza" },
};

export default function SicPizzaWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="SIC Pizza, step by step"
      intro="One live table, and everyone sees what they need. A guest proposes an item, the server approves it, the kitchen and expo work it, and the manager sees what needs attention. Here is that path in seven screens."
      note="SIC Pizza is a fictional restaurant used to demonstrate a restaurant-agnostic platform. These are screens from the working prototype with invented data, and payments are simulated. It is a concept, not a deployed system."
      steps={sicPizzaWalkthroughSteps}
      cta={{
        heading: "Want this shaped around your own restaurant?",
        body: "We build ordering, kitchen and payment workflows around how your restaurant already runs, and you own the result.",
        inquiryLabel: "Talk about your restaurant",
        inquiryHref: "/#contact",
        caseStudyHref: "/work/sic-pizza-pos",
      }}
    />
  );
}
