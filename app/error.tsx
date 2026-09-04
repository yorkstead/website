"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          An unexpected error occurred. You can retry loading the page or return to the homepage.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw className="mr-1.5 size-4" />Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1.5 size-4" />Return home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
