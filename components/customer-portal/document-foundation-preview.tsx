// Fictional presentation only: intentionally has no service/database dependency.
export function DocumentFoundationPreview() {
  return (
    <section aria-labelledby="document-foundation-title" className="mx-auto max-w-7xl space-y-5 px-4 pb-12 sm:px-8">
      <h2 id="document-foundation-title" className="text-xl font-semibold">Document review · fictional example</h2>
      <p className="text-sm text-muted-foreground">Metadata preview only. Internal owner review is separate from customer consent. Customer approvals and downloads are disabled.</p>
      <div className="grid gap-6 rounded-xl border border-border p-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium">Example project brief</h3>
          <p className="text-sm text-warning">Pending internal review · version 2</p>
          <ol aria-label="Fictional version history" className="space-y-2 text-sm text-muted-foreground">
            <li>Version 2 · current · internal review · October 22, 2026</li>
            <li>Version 1 · prior snapshot · October 20, 2026</li>
          </ol>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">Read-only audit timeline · fictional</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>October 22 · Demo owner · internal approval requested for version 2</li>
            <li>October 22 · Demo owner · version 2 registered; version 1 request superseded</li>
            <li>October 20 · Demo owner · document and version 1 registered</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
