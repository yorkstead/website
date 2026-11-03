import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SystemsRegistryReadiness } from "@/components/dashboard/systems-registry-readiness";
import { SystemsRegistryNavigation } from "@/components/dashboard/systems-registry-navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";

export const metadata = { title: "Registry Readiness | Yorkstead", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";
export default async function SystemsRegistryReadinessPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard/systems/registry/readiness");
  if (!isTypedSystemRegistryAllowed(true)) notFound();
  return <><SystemsRegistryNavigation current="/dashboard/systems/registry/readiness"/><SystemsRegistryReadiness/></>;
}
