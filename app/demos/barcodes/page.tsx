import type { Metadata } from "next";
import { Walkthrough } from "@/components/walkthrough";
import { barcodesWalkthroughSteps } from "@/lib/barcodes-walkthrough";

export const metadata: Metadata = {
  title: "Employee barcode labels walkthrough | Yorkstead",
  description: "Follow the employee barcode label tool from the directory to a printed sheet of Code 128 labels, using screens from the working application.",
  alternates: { canonical: "/demos/barcodes" },
};

export default function BarcodesWalkthroughPage() {
  return (
    <Walkthrough
      eyebrow="Walkthrough"
      title="Employee barcode labels, step by step"
      intro="Production teams that scan employee numbers at every station need labels that are easy to issue and print. This small tool keeps the employee directory and turns it into sheets of Code 128 labels. Here is that path in five screens."
      note="These are screens from the working application, run with invented employees and numbers. It was first built for a workplace and is shown here as a demonstration."
      steps={barcodesWalkthroughSteps}
      cta={{
        heading: "Need labels or scan points in your own shop?",
        body: "We build small tools like this around how your operation already works, and you own the result.",
        inquiryLabel: "Talk about your shop",
        inquiryHref: "/#contact",
        caseStudyHref: "/work/employee-barcodes",
      }}
    />
  );
}
