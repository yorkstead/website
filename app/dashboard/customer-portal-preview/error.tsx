"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerPortalPreviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dark grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-lg bg-card">
        <CardContent className="p-7 text-center">
          <AlertTriangle className="mx-auto size-6 text-warning" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Preview temporarily unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">No project or customer record was changed. Try rendering the fictional preview again or return to the owner workspace.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={reset}><RefreshCw aria-hidden="true" /> Try again</Button>
            <Button variant="secondary" asChild><Link href="/dashboard">Return to workspace</Link></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
