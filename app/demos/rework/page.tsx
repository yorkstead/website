import type { Metadata } from "next";
import Link from "next/link";
import { ReworkDemo } from "@/components/public-demo/rework-demo";

export const metadata: Metadata = {
  title: "Rework Flow public sandbox",
  description: "Explore a fictional freight rework operation from bay hold to evidence-backed demo invoice.",
  alternates: { canonical: "/demos/rework" },
  robots: { index: false, follow: false },
};

export default async function ReworkDemoPage({ searchParams }: {
  searchParams: Promise<{ scenario?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <>
      <nav aria-label="Demo navigation" className="mx-auto max-w-7xl px-5 py-3 text-sm sm:px-8">
        <Link href="/demos" className="text-muted-foreground hover:text-foreground">← All demos</Link>
      </nav>
      <ReworkDemo initialScenario={typeof query.scenario === "string" ? query.scenario : undefined} initialGuided={query.mode === "guided"} />
    </>
  );
}
