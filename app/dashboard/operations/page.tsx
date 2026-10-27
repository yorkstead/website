import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { OperationsWorkspace } from "@/components/dashboard/operations";

export const metadata = {
  title: "Operations | Yorkstead",
  robots: { index: false, follow: false },
};

export default async function OperationsPage() {
  if (!(await getOwnerSession(await headers())))
    redirect("/login?next=/dashboard/operations");
  return <OperationsWorkspace />;
}
