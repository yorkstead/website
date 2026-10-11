import { after, type NextRequest, NextResponse } from "next/server";
import { cardScanSource } from "@/lib/contact-card";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { hashedRequestAddress } from "@/lib/request-privacy";

export const runtime = "nodejs";

// The printed QR code points here, not at /card, so the destination can change
// after cards are printed. A temporary redirect keeps phones from caching it.
export async function GET(request: NextRequest) {
  const source = cardScanSource(request.nextUrl.searchParams.get("src"));
  const visitorHash = hashedRequestAddress(request.headers, "conversion-analytics", true);

  after(async () => {
    try {
      await recordConversionEvent({ event: "card_scan", path: "/c", visitorHash, metadata: { source } });
    } catch (error) {
      console.error("Card scan event unavailable", error instanceof Error ? error.message : "unknown error");
    }
  });

  const response = NextResponse.redirect(new URL("/card", request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
