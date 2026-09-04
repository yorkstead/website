import { MoveUpRight, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginPanel } from "@/components/login-panel";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auto?: string }> }) {
  const params = await searchParams;
  const requestedPath = params.next;
  const privateDestinations = ["/dashboard", "/dashboard/leads", "/dashboard/consultations", "/dashboard/marketing", "/dashboard/marketing/one-sheet", "/account"] as const;
  const nextPath = privateDestinations.find((path) => path === requestedPath) ?? "/dashboard";
  const autoPrompt = params.auto !== "0" && params.auto !== "false";
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_42%)]" />
      <div className="relative flex w-full max-w-md flex-col items-center">
        <BrandMark showDescriptor={false} className="mb-6" />

        {/* Callout directing demo visitors to Operations without needing login */}
        <div className="mb-6 w-full rounded-xl border border-primary/30 bg-primary/10 p-4 text-left backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="size-4 shrink-0" />
            <span>Looking for Yorkstead Operations?</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            The interactive operations sandboxes run on synthetic dummy data and require <strong>zero login</strong> to test.
          </p>
          <a
            href="https://ops.yorkstead.com/demo"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <span>Launch Operations Demo</span>
            <MoveUpRight className="size-3.5" />
          </a>
        </div>

        <LoginPanel nextPath={nextPath} autoPrompt={autoPrompt} />

        <p className="mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">
          This portal is reserved for private project command and owner administration. Passkeys stay on your device or trusted password manager.
        </p>
      </div>
    </main>
  );
}
