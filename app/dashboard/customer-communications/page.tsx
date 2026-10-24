import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { CustomerCommunications } from "@/components/dashboard/customer-communications";
export const metadata = {
  title: "Customer Communications | Yorkstead",
  robots: { index: false, follow: false },
};
export default async function CustomerCommunicationsPage() {
  if (!(await getOwnerSession(await headers())))
    redirect("/login?next=/dashboard/customer-communications");
  return <CustomerCommunications />;
}
