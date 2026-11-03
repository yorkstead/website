import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";
import { SystemsRegistry } from "@/components/dashboard/systems-registry";
import { SystemsRegistryNavigation } from "@/components/dashboard/systems-registry-navigation";

export const metadata={title:"Systems Registry | Yorkstead",robots:{index:false,follow:false,noarchive:true}};
export const dynamic="force-dynamic";
export default async function SystemsRegistryPage(){
  const session=await getOwnerSession(await headers());
  if(!session)redirect("/login?next=/dashboard/systems/registry");
  if(!isTypedSystemRegistryAllowed(true))notFound();
  return <><SystemsRegistryNavigation current="/dashboard/systems/registry"/><SystemsRegistry/></>;
}
