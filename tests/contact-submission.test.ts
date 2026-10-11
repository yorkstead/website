import { describe, expect, test } from "bun:test";
import {
  processContactSubmission,
  validateContactPayload,
  contactSubmissionKey,
  type ContactPayload,
  type ContactStore,
} from "@/lib/contact-submission";
import { allowedProductIds, isAllowedProductId, getProductInquiryDetails } from "@/lib/product-inquiry";
import { sendLeadNotification } from "@/lib/lead-notification";

describe("Product inquiry allowlist & validation", () => {
  test("strictly enforces product allowlist", () => {
    expect(allowedProductIds).toEqual(["rework-flow", "union-os", "expanded-warehousing"]);
    expect(isAllowedProductId("rework-flow")).toBe(true);
    expect(isAllowedProductId("union-os")).toBe(true);
    expect(isAllowedProductId("expanded-warehousing")).toBe(true);
    expect(isAllowedProductId("custom-operations-system")).toBe(false);
    expect(isAllowedProductId("table-os-turnkey")).toBe(false);
    expect(isAllowedProductId("")).toBe(false);
    expect(isAllowedProductId(null)).toBe(false);
    expect(isAllowedProductId(undefined)).toBe(false);
  });

  test("resolves product inquiry details for confirmed systems", () => {
    const rework = getProductInquiryDetails("rework-flow");
    expect(rework).not.toBeNull();
    expect(rework?.name).toBe("Rework Flow");
    expect(rework?.priceLabel).toBe("$7,500");
    expect(rework?.category).toBe("Freight Rework & Exception Management");

    expect(getProductInquiryDetails("unknown-product")).toBeNull();
    expect(getProductInquiryDetails(null)).toBeNull();
  });
});

describe("Contact & Product Inquiry Form Outcomes", () => {
  const validPayload: ContactPayload = {
    name: "Marcus Vance",
    email: "marcus@denverfreight.test",
    company: "Denver Freight Logistics",
    projectType: "Rework Flow",
    productId: "rework-flow",
    message: "We need trailer-side count tracking and driver sign-off for our dock operations.",
  };

  test("1. Server-side validation failure on invalid input or unapproved product", () => {
    // Missing/short name
    const shortNameErrors = validateContactPayload({ ...validPayload, name: "M" });
    expect(shortNameErrors.name).toBeDefined();

    // Invalid email
    const badEmailErrors = validateContactPayload({ ...validPayload, email: "not-an-email" });
    expect(badEmailErrors.email).toBeDefined();

    // Short message (< 20 chars)
    const shortMsgErrors = validateContactPayload({ ...validPayload, message: "Too short" });
    expect(shortMsgErrors.message).toBeDefined();

    // Unallowed product identifier
    const unallowedProdErrors = validateContactPayload({ ...validPayload, productId: "unapproved-system" });
    expect(unallowedProdErrors.projectType).toBe("Select a valid product or project type.");
  });

  test("2. Successful valid submission and confirmation with product context", async () => {
    let capturedValues: Parameters<ContactStore["insert"]>[0] | null = null;
    let capturedKey = "";

    const mockStore: ContactStore = {
      countRecent: async () => 0,
      insert: async (values, submissionKey) => {
        capturedValues = values;
        capturedKey = submissionKey;
        return 742;
      },
    };

    const result = await processContactSubmission(validPayload, mockStore);

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.id).toBe(742);
      expect(result.projectType).toBe("Rework Flow");
      expect(result.budget).toBe("$7,500");
      expect(result.message).toContain("Message received");
      expect(result.intake).toEqual({
        inquiryType: "product_inquiry",
        productId: "rework-flow",
        productName: "Rework Flow",
        productPrice: "$7,500",
        productCategory: "Freight Rework & Exception Management",
      });
    }

    // Verify stored values in database adapter
    expect(Boolean(capturedValues)).toBe(true);
    const stored = capturedValues!;
    expect(stored.name).toBe("Marcus Vance");
    expect(stored.email).toBe("marcus@denverfreight.test");
    expect(stored.company).toBe("Denver Freight Logistics");
    expect(stored.projectType).toBe("Rework Flow");
    expect(stored.budget).toBe("$7,500");
    expect((stored.intake as Record<string, unknown>)?.productId).toBe("rework-flow");
    expect(capturedKey).toBe(contactSubmissionKey("marcus@denverfreight.test", "rework-flow"));
  });

  test("3. Storage failure returns useful customer error without crashing", async () => {
    const failingStore: ContactStore = {
      countRecent: async () => 0,
      insert: async () => {
        throw new Error("Neon PostgreSQL connection timeout");
      },
    };

    const result = await processContactSubmission(validPayload, failingStore);
    expect(result.status).toBe("server_error");
    if (result.status === "server_error") {
      expect(result.message).toContain("temporarily unavailable");
      expect(result.message).toContain("Email");
      expect((result.error as Error).message).toBe("Neon PostgreSQL connection timeout");
    }
  });

  test("4. Duplicate handling where the flow supports it", async () => {
    // When ON CONFLICT DO NOTHING returns null (record already exists for submission_key)
    const duplicateStore: ContactStore = {
      countRecent: async () => 0,
      insert: async () => null,
    };

    const result = await processContactSubmission(validPayload, duplicateStore);
    expect(result.status).toBe("duplicate");
    if (result.status === "duplicate") {
      expect(result.message).toContain("already received");
    }
  });

  test("5. Rate limiting protects the intake endpoint", async () => {
    const rateLimitedStore: ContactStore = {
      countRecent: async () => 5,
      insert: async () => 1,
    };

    const result = await processContactSubmission(validPayload, rateLimitedStore);
    expect(result.status).toBe("rate_limited");
    if (result.status === "rate_limited") {
      expect(result.message).toContain("several messages recently");
    }
  });

  test("6. Honeypot traps spam bot submissions silently", async () => {
    let insertCalled = false;
    const mockStore: ContactStore = {
      countRecent: async () => 0,
      insert: async () => {
        insertCalled = true;
        return 1;
      },
    };

    const result = await processContactSubmission({ ...validPayload, website: "https://spam.test" }, mockStore);
    expect(result.status).toBe("spam");
    expect(insertCalled).toBe(false);
  });

  test("7. External email delivery is safely mocked and blocked in test environment", async () => {
    const prevKey = process.env.RESEND_API_KEY;
    const prevEmail = process.env.CONTACT_NOTIFICATION_EMAIL;

    try {
      delete process.env.RESEND_API_KEY;
      delete process.env.CONTACT_NOTIFICATION_EMAIL;

      const notification = await sendLeadNotification({
        id: 742,
        name: "Marcus Vance",
        email: "marcus@denverfreight.test",
        company: "Denver Freight",
        projectType: "Rework Flow",
        budget: "$7,500",
        message: "Test message",
        intake: { productId: "rework-flow", productName: "Rework Flow" },
      });

      expect(notification.sent).toBe(false);
      expect(notification.reason).toBe("not-configured");
    } finally {
      if (prevKey) process.env.RESEND_API_KEY = prevKey;
      if (prevEmail) process.env.CONTACT_NOTIFICATION_EMAIL = prevEmail;
    }
  });
});
