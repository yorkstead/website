import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { ClientPublishing } from "@/components/dashboard/client-publishing";
export const metadata = { title: "Client Publishing | Yorkstead", robots: { index: false, follow: false } };
export default async function ClientPublishingPage() {
  if (!(await getOwnerSession(await headers()))) redirect("/login?next=/dashboard/client-publishing");
  return <ClientPublishing />;
}
