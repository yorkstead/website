import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerPortal } from "@/components/customer-portal/customer-portal";
import { customerPortalDemo } from "@/lib/customer-portal-demo";
import { customerPortalCapabilities } from "@/lib/customer-portal-authorization";
import { normalizePortalProgress, type CustomerPortalView } from "@/lib/customer-portal-view";

function render(portal: CustomerPortalView = customerPortalDemo) {
  return renderToStaticMarkup(<CustomerPortal portal={portal} />);
}

describe("customer portal presentation", () => {
  test("renders every semantic portal section from fictional data", () => {
    const html = render();

    expect(html).toContain("<main id=\"portal-content\">");
    expect(html).toContain('aria-label="Portal sections"');
    expect(html).toContain('id="portal-title"');
    expect(html).toContain('aria-labelledby="timeline-title"');
    expect(html).toContain('id="timeline-title"');
    expect(html).toContain('aria-labelledby="deliverables-title"');
    expect(html).toContain('id="deliverables-title"');
    expect(html).toContain('aria-labelledby="updates-title"');
    expect(html).toContain('id="updates-title"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Fictional demo · no production client data");
    expect(html).toContain("Northline Workshop");
    expect(html).toContain("Date to be confirmed");
  });

  test("distinguishes drafts, internal review, and approved records without publishing or files", () => {
    const html = render();

    expect(html).toContain("Draft");
    expect(html).toContain("Internal review");
    expect(html).toContain("Approved");
    expect(html).toContain("Document sharing is disabled");
    expect(html).not.toContain("download=");
    expect(html).not.toContain("target=\"_blank\"");
    expect(html).not.toContain("https://");
  });

  test("renders meaningful empty states", () => {
    const html = render({
      ...customerPortalDemo,
      milestones: [],
      deliverables: [],
      activity: [],
    });

    expect(html).toContain("Timeline is being prepared");
    expect(html).toContain("No deliverables yet");
    expect(html).toContain("No project updates yet");
  });

  test("keeps the deterministic demo fixture immutable and detached from persistence", () => {
    const before = JSON.stringify(customerPortalDemo);
    render();

    expect(JSON.stringify(customerPortalDemo)).toBe(before);
    expect(Object.isFrozen(customerPortalDemo)).toBe(true);
    expect(Object.isFrozen(customerPortalDemo.milestones)).toBe(true);
    expect(Object.isFrozen(customerPortalDemo.deliverables)).toBe(true);
    expect(Object.isFrozen(customerPortalDemo.activity)).toBe(true);
    expect(before).not.toContain("Adorned");
    expect(before).not.toContain("tenant");
    expect(before).not.toContain("projectId");
  });

  test("keeps every customer-facing capability disabled", () => {
    expect(customerPortalCapabilities).toEqual({
      login: false,
      invitations: false,
      publishedUpdates: false,
      documentSharing: false,
    });
  });

  test("normalizes progress defensively", () => {
    expect(normalizePortalProgress(-8)).toBe(0);
    expect(normalizePortalProgress(61.6)).toBe(62);
    expect(normalizePortalProgress(120)).toBe(100);
    expect(normalizePortalProgress(Number.NaN)).toBe(0);
  });

  test("renders dashboard navigation without escaped newline text", async () => {
    const source = await Bun.file("app/dashboard/page.tsx").text();

    expect(source).toContain(`Marketing</Link>
            <Link href="/dashboard/customer-portal-preview"`);
    expect(source).not.toContain("Marketing</Link>\\n");
  });

  test("includes the established responsive layout and focus conventions", async () => {
    const source = await Bun.file("components/customer-portal/customer-portal.tsx").text();

    expect(source).toContain("md:grid-cols-3");
    expect(source).toContain("md:grid-cols-2");
    expect(source).toContain("lg:grid-cols-");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("focus:not-sr-only");
    expect(source).not.toContain("from-");
    expect(source).not.toContain("animate-");
  });
});
