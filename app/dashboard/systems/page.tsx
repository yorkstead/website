import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { SystemsDirectory } from "@/components/dashboard/systems-directory";

export const metadata={title:"Systems Directory | Yorkstead",robots:{index:false,follow:false,noarchive:true}};
export default async function SystemsPage(){
  if(!(await getOwnerSession(await headers()))) redirect("/login?next=/dashboard/systems");
  return <SystemsDirectory/>;
}
