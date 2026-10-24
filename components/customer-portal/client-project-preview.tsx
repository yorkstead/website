import { CustomerPortal } from "@/components/customer-portal/customer-portal";
import { clientProjectDemo } from "@/lib/client-project-demo";
import { toCustomerPortalView } from "@/lib/client-project-projection";

export function ClientProjectPreview() {
  return <section aria-label="Fictional source projection preview" className="border-t border-border">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h2 className="text-lg font-semibold">Source projection preview</h2>
      <p className="mt-2 text-sm text-muted-foreground">Fictional source records with explicit synthetic publication decisions. Customer access remains disabled.</p>
    </div>
    <CustomerPortal portal={{ ...toCustomerPortalView(clientProjectDemo), fixtureLabel: "Fictional source projection · no production client data" }} />
  </section>;
}

export function ClientProjectState({ state }: { state: "loading" | "empty" | "unavailable" | "revoked" }) {
  const messages = {
    loading: ["Loading project", "Checking current project access."],
    empty: ["Project view is being prepared", "Reviewed project information will appear after publication."],
    unavailable: ["Project temporarily unavailable", "Try again later or contact the Yorkstead project team."],
    revoked: ["Project access unavailable", "Your project access may have changed. Contact the Yorkstead project team."],
  } as const;
  return <div role="status" aria-busy={state === "loading"} className="rounded-xl border border-border bg-card p-6">
    <h2 className="text-lg font-semibold">{messages[state][0]}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{messages[state][1]}</p>
  </div>;
}
