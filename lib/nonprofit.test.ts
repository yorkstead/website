import { describe, expect, it } from "bun:test";
import { parseNonprofit } from "./nonprofit";

describe("nonprofit intake", () => {
  it("accepts partial answers and retains food selections and multiline details", () => {
    const data = new FormData();
    data.set("name", "Jane Example"); data.set("email", "jane@example.com");
    data.set("mailingAddress", "123 Example St\nAnacortes, WA");
    data.append("foods", "Produce"); data.append("foods", "Frozen foods");
    const result = parseNonprofit(data);
    expect(result.message).toContain("123 Example St\nAnacortes, WA");
    expect(result.message).toContain("Food types: Produce, Frozen foods");
    expect(result.message).toContain("Proposed president: Not provided");
  });
  it("rejects oversized answers rather than silently truncating them", () => {
    const data = new FormData(); data.set("notes", "x".repeat(601));
    expect(() => parseNonprofit(data)).toThrow();
  });
  it("rejects forged food choices and uploaded objects", () => {
    const data = new FormData(); data.append("foods", "unlisted");
    expect(() => parseNonprofit(data)).toThrow();
    const file = new FormData(); file.set("name", new Blob(["bad"]), "name.txt");
    expect(() => parseNonprofit(file)).toThrow();
  });
});
