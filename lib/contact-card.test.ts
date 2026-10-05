import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCardVCard, cardContact, cardScanSource, cardTextHref } from "@/lib/contact-card";
import { conversionEventNames } from "@/lib/conversion-analytics";

describe("business card contact", () => {
  test("vCard carries the printed phone and email", () => {
    const vcard = buildCardVCard();
    expect(vcard.startsWith("BEGIN:VCARD\r\n")).toBe(true);
    expect(vcard).toContain(`TEL;TYPE=CELL,VOICE:${cardContact.phoneE164}`);
    expect(vcard).toContain("EMAIL;TYPE=INTERNET,WORK:brandon@yorkstead.com");
    expect(vcard).toContain("TITLE:Founder\r\n");
    expect(vcard).not.toContain("ops.yorkstead.com");
  });

  test("text link opens a message to the card number", () => {
    expect(cardTextHref.startsWith("sms:+17203314865?body=")).toBe(true);
  });

  test("scan source accepts simple tags and falls back to card", () => {
    expect(cardScanSource("Shops")).toBe("shops");
    expect(cardScanSource(null)).toBe("card");
    expect(cardScanSource("<script>")).toBe("card");
    expect(cardScanSource("x".repeat(41))).toBe("card");
  });

  test("database constraint allows every conversion event the app records", () => {
    const migration = readFileSync(resolve(import.meta.dir, "../migrations/0005_card-conversion-events.sql"), "utf8");
    for (const name of conversionEventNames) expect(migration).toContain(`'${name}'`);
  });
});
