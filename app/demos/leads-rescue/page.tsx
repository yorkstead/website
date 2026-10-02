import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { leadsRescueWalkthroughSteps } from "@/lib/leads-rescue-walkthrough";

export const metadata: Metadata = {
  title: "Missed-call text-back walkthrough | Yorkstead",
  description: "See how a contractor's missed call can turn into a booked inspection through an automatic text, using screens from the Leads Rescue demo.",
  alternates: { canonical: "/demos/leads-rescue" },
};

export default function LeadsRescueWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="Leads Rescue, step by step"
      intro="A contractor on a roof cannot answer the phone, and the homeowner calls the next company. Leads Rescue texts back right away, collects the details and offers inspection times. Here is that path in five screens."
      note="This is a simulation with invented names and numbers. The replies are scripted, and nothing connects to a real phone line, calendar or customer system."
      steps={leadsRescueWalkthroughSteps}
      cta={{
        heading: "Losing jobs to missed calls?",
        body: "We build the follow-up around how your crew already works, and you own the result.",
        inquiryLabel: "Talk about your leads",
        inquiryHref: "/#contact",
        caseStudyHref: "/demos",
        caseStudyLabel: "See all demos",
      }}
    />
  );
}
