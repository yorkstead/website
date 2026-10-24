export default function CustomerPortalPreviewLoading() {
  return (
    <main className="dark min-h-screen bg-background px-4 py-10 text-foreground sm:px-8" aria-busy="true" aria-label="Loading customer portal preview">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-5 w-56 rounded bg-secondary" />
        <div className="mt-16 h-3 w-36 rounded bg-primary/20" />
        <div className="mt-4 h-12 max-w-3xl rounded bg-secondary" />
        <div className="mt-5 h-5 max-w-2xl rounded bg-secondary/70" />
        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 rounded-xl border border-border bg-card" />)}
        </div>
        <span className="sr-only">Loading preview</span>
      </div>
    </main>
  );
}
