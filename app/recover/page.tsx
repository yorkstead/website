import type { Metadata } from "next";
import { RecoveryForm } from "./recovery-form";

export const metadata: Metadata = { title: "Recover owner access", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <main className="mx-auto max-w-lg px-5 py-20"><h1 className="text-3xl font-semibold">Recover your account</h1><RecoveryForm token={token} invalid={Boolean(error)} /></main>;
}
