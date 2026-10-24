import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { ClientAccess } from "@/components/dashboard/client-access";
export const metadata = {
  title: "Client Access | Yorkstead",
  robots: { index: false, follow: false },
};
export default async function ClientAccessPage() {
  if (!(await getOwnerSession(await headers())))
    redirect("/login?next=/dashboard/client-access");
  return <ClientAccess />;
}
