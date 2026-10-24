import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentFoundationPreview } from "@/components/customer-portal/document-foundation-preview";

test("fictional read-only preview distinguishes internal review from customer consent", () => {
  const html = renderToStaticMarkup(<DocumentFoundationPreview />);
  expect(html).toContain("fictional example");
  expect(html).toContain("Version 1");
  expect(html).toContain("Version 2");
  expect(html).toContain("Pending internal review");
  expect(html).toContain("Read-only audit timeline");
  expect(html).toContain("Customer approvals and downloads are disabled");
  expect(html).not.toMatch(/<button|<input|<form|href=|Adorned|https?:/);
});
