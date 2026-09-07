import { NextResponse } from "next/server";
import { publicBusinessDetails } from "@/lib/local-business";

export async function GET() {
  const phoneLine = publicBusinessDetails.phone
    ? `TEL;TYPE=CELL,VOICE:${publicBusinessDetails.phone.replace(/[^+\d]/g, "")}\n`
    : "";

  const vcard = `BEGIN:VCARD
VERSION:3.0
N:York;Brandon;;;
FN:Brandon York
ORG:Yorkstead Systems
TITLE:Founder & Principal Systems Architect
EMAIL;TYPE=INTERNET,WORK:brandon@yorkstead.com
EMAIL;TYPE=INTERNET,OFFICE:hello@yorkstead.com
${phoneLine}URL;TYPE=WORK:https://yorkstead.com
URL;TYPE=PORTAL:https://yorkstead.com/connect
URL;TYPE=OPERATIONS:https://ops.yorkstead.com
NOTE:Industrial Software & Workflow Automation for Manufacturing, Logistics, and Hospitality.
END:VCARD`;

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brandon-york.vcf"',
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
