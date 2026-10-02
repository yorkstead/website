import type { Metadata } from "next";
import { ScenarioHub } from "@/components/public-demo/scenario-hub";

export const metadata: Metadata = {
  title: "Operational scenario walkthroughs | Yorkstead",
  description: "Step through synthetic scenarios where a workflow gap costs money, and see how a purpose-built interlock closes it.",
  alternates: { canonical: "/demos/scenarios" },
  robots: { index: false, follow: false },
};

export default function ScenariosPage() {
  return <ScenarioHub />;
}
