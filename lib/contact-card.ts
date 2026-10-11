import { brand } from "@/lib/brand";

// The details printed on the business card. The QR code on the card points to
// /c, which counts the scan and redirects to /card.
export const cardContact = {
  firstName: "Brandon",
  lastName: "York",
  title: "Founder",
  organization: brand.name,
  city: "Denver, Colorado",
  phoneDisplay: "720.331.4865",
  phoneE164: "+17203314865",
  email: "brandon@yorkstead.com",
  siteURL: brand.siteURL,
} as const;

export const cardFullName = `${cardContact.firstName} ${cardContact.lastName}`;
export const cardPhoneHref = `tel:${cardContact.phoneE164}`;
export const cardTextHref = `sms:${cardContact.phoneE164}?body=${encodeURIComponent("Hi Brandon, we met and I got your card. ")}`;
export const cardEmailHref = `mailto:${cardContact.email}?subject=${encodeURIComponent("We met, following up")}`;

// The one-time price the homepage illustration uses for our two named systems.
export const namedSystemPrice = 7500;

function escapeVCardText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export function buildCardVCard() {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardText(cardContact.lastName)};${escapeVCardText(cardContact.firstName)};;;`,
    `FN:${escapeVCardText(cardFullName)}`,
    `ORG:${escapeVCardText(cardContact.organization)}`,
    `TITLE:${escapeVCardText(cardContact.title)}`,
    `TEL;TYPE=CELL,VOICE:${cardContact.phoneE164}`,
    `EMAIL;TYPE=INTERNET,WORK:${cardContact.email}`,
    `URL;TYPE=WORK:${cardContact.siteURL}`,
    `ADR;TYPE=WORK:;;;Denver;CO;;USA`,
    `NOTE:${escapeVCardText("Software you own. No subscription. We build systems for businesses that make or move physical things.")}`,
    "END:VCARD",
    "",
  ].join("\r\n");
}

export function cardContactResponse() {
  return new Response(buildCardVCard(), {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brandon-york.vcf"',
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

const sourcePattern = /^[a-z0-9-]{1,40}$/i;

// Printed codes can carry ?src= (for example a trade-specific card). Anything
// unexpected is recorded as the plain card so analytics stays clean.
export function cardScanSource(value: string | null) {
  return value && sourcePattern.test(value) ? value.toLowerCase() : "card";
}
