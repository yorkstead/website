import { expect, test } from "bun:test";
import { loadOwnerOverlapReview } from "@/lib/overlap-review";

test("unauthorized review does not read private sources", async () => {
  let reads = 0;
  const read = async () => { reads += 1; return { candidates: [], limited: false }; };
  expect(await loadOwnerOverlapReview(false, "Acme", read)).toBeNull();
  expect(await loadOwnerOverlapReview(true, null, read)).toBeNull();
  expect(reads).toBe(0);
  await loadOwnerOverlapReview(true, "Acme", read);
  expect(reads).toBe(1);
});
