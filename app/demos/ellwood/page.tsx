import type { Metadata } from "next";
import Link from "next/link";
import { EllwoodDemo } from "@/components/public-demo/ellwood-demo";

export const metadata: Metadata = {
  title: "Ellwood Flow concept walkthrough",
  description: "Explore a fictional manufacturing release and revision handoff. A concept inspired by workplace experience.",
  alternates: { canonical: "/demos/ellwood" },
  robots: { index: false, follow: false },
};

export default async function EllwoodDemoPage({ searchParams }: {
  searchParams: Promise<{ scenario?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <>
      <nav aria-label="Demo navigation" className="mx-auto max-w-7xl px-5 py-3 text-sm sm:px-8">
        <Link href="/demos" className="text-muted-foreground hover:text-foreground">← All demos</Link>
      </nav>
      <EllwoodDemo initialScenario={typeof query.scenario === "string" ? query.scenario : undefined} initialGuided={query.mode === "guided"} />
    </>
  );
}
