import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOwnerSession } from "@/lib/owner-session";
import { getOwnerPublishingService } from "@/lib/owner-publishing-runtime";
import { toCustomerPortalView } from "@/lib/client-project-projection";
import { CustomerPortal } from "@/components/customer-portal/customer-portal";
export const dynamic = "force-dynamic";
export const metadata = { title: "Approved client preview | Yorkstead", robots: { index: false, follow: false } };
export default async function ApprovedClientPreview({ searchParams }: { searchParams: Promise<{ projectId?: string | string[] }> }) {
  const requestHeaders = await headers();
  if (!(await getOwnerSession(requestHeaders))) redirect("/login?next=/dashboard/client-publishing");
  const parsed = z.string().min(1).max(200).refine(v => v===v.trim()).safeParse((await searchParams).projectId);
  let portal = null;
  if (parsed.success) {
    try { const view = await getOwnerPublishingService().publishingWorkspace(requestHeaders, parsed.data); if (view.selected?.preview) portal = toCustomerPortalView(view.selected.preview); }
    catch { /* No fallback or internal error details in this frame. */ }
  }
  if (!portal) return <main className="dark min-h-screen bg-background p-6 text-foreground"><h1 className="text-xl font-semibold">Approved project preview unavailable</h1><p className="mt-3 text-sm text-muted-foreground">Refresh the review queue. An active mapping and a current approved overview are required.</p></main>;
  return <div><aside className="dark bg-background px-4 py-3 text-xs text-warning">Owner-only approved snapshot preview · customer access remains disabled</aside><CustomerPortal portal={portal} /></div>;
}
