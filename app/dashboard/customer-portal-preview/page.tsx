import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { CustomerPortal } from "@/components/customer-portal/customer-portal";
import { customerPortalDemo } from "@/lib/customer-portal-demo";
import { getOwnerSession } from "@/lib/owner-session";

export const metadata: Metadata = {
  title: "Customer portal preview | Yorkstead Systems",
  description: "Owner-only fictional preview of the Yorkstead customer portal interface.",
  robots: { index: false, follow: false },
};

export default async function CustomerPortalPreviewPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard/customer-portal-preview");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <aside aria-label="Internal preview notice" className="border-b border-warning/25 bg-warning/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="flex items-center gap-2 text-xs text-warning">
            <Eye className="size-4" aria-hidden="true" />
            Owner-only interface preview · fictional demo data · customer access disabled
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-background/30">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Return to workspace
          </Link>
        </div>
      </aside>
      <CustomerPortal portal={customerPortalDemo} />
    </div>
  );
}
