import { cardContactResponse } from "@/lib/contact-card";

// Kept so contact links from the earlier card still download the same file.
export function GET() {
  return cardContactResponse();
}
