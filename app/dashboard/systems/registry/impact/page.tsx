import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SystemsRegistryImpact } from "@/components/dashboard/systems-registry-impact";
import { SystemsRegistryNavigation } from "@/components/dashboard/systems-registry-navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";

export const metadata = { title: "Dependency Impact | Yorkstead", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";
export default async function SystemsRegistryImpactPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard/systems/registry/impact");
  if (!isTypedSystemRegistryAllowed(true)) notFound();
  return <><SystemsRegistryNavigation current="/dashboard/systems/registry/impact"/><SystemsRegistryImpact/></>;
}
