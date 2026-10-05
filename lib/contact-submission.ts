import { createHash } from "node:crypto";
import { isValidEmailAddress } from "@/lib/semantic-validation";
import { isAllowedProductId, getProductInquiryDetails } from "@/lib/product-inquiry";
import { brand } from "@/lib/brand";

export type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  projectType?: string;
  productId?: string;
  budget?: string;
  message: string;
  website?: string;
};

export type ContactValidationErrors = Partial<Record<"name" | "email" | "message" | "projectType", string>>;

export type ContactSubmissionResult =
  | {
      status: "success";
      id: number;
      message: string;
      projectType: string;
      budget: string;
      intake?: Record<string, unknown>;
    }
  | { status: "invalid"; errors: ContactValidationErrors; message: string }
  | { status: "duplicate"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "spam"; message: string }
  | { status: "server_error"; message: string; error?: unknown };

export type ContactStore = {
  countRecent: () => Promise<number>;
  insert: (
    values: {
      name: string;
      email: string;
      company: string | null;
      projectType: string | null;
      budget: string | null;
      message: string;
      intake?: Record<string, unknown> | null;
    },
    submissionKey: string
  ) => Promise<number | null>;
};

export function contactSubmissionKey(email: string, projectOrProduct: string, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const canonical = [day, email.toLowerCase(), projectOrProduct.toLowerCase()].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function validateContactPayload(payload: ContactPayload): ContactValidationErrors {
  const errors: ContactValidationErrors = {};
  const name = (payload.name ?? "").trim();
  if (name.length < 2) {
    errors.name = "Tell me what to call you.";
  }
  const email = (payload.email ?? "").trim().toLowerCase();
  if (!isValidEmailAddress(email, 180)) {
    errors.email = "Enter a valid email address.";
  }
  const message = (payload.message ?? "").trim();
  if (message.length < 20) {
    errors.message = "Give me at least a few details about the problem.";
  }
  if (payload.productId && !isAllowedProductId(payload.productId)) {
    errors.projectType = "Select a valid product or project type.";
  }
  return errors;
}

export async function processContactSubmission(
  payload: ContactPayload,
  store: ContactStore
): Promise<ContactSubmissionResult> {
  const website = (payload.website ?? "").trim();
  if (website) {
    return { status: "spam", message: "Thanks—your message is in the queue." };
  }

  const errors = validateContactPayload(payload);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors, message: "Check the highlighted fields." };
  }

  try {
    const recent = await store.countRecent();
    if (recent >= 5) {
      return {
        status: "rate_limited",
        message: "That channel has received several messages recently. Try again later or email directly.",
      };
    }

    let projectType = (payload.projectType ?? "").trim();
    let budget = (payload.budget ?? "").trim();
    let intake: Record<string, unknown> | undefined = undefined;

    if (payload.productId && isAllowedProductId(payload.productId)) {
      const product = getProductInquiryDetails(payload.productId);
      if (product) {
        projectType = product.name;
        if (!budget) {
          budget = product.priceLabel;
        }
        intake = {
          inquiryType: "product_inquiry",
          productId: product.id,
          productName: product.name,
          productPrice: product.priceLabel,
          productCategory: product.category,
        };
      }
    }

    const key = contactSubmissionKey(payload.email, payload.productId || projectType || "general");
    const id = await store.insert(
      {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        company: payload.company?.trim() || null,
        projectType: projectType || null,
        budget: budget || null,
        message: payload.message.trim(),
        intake: intake ?? null,
      },
      key
    );

    if (id === null) {
      return {
        status: "duplicate",
        message: "Your message is already received. We'll be in touch shortly.",
      };
    }

    return {
      status: "success",
      id,
      message: "Message received. I’ll review it and get back to you directly.",
      projectType,
      budget,
      intake,
    };
  } catch (error) {
    return {
      status: "server_error",
      message: `The contact channel is temporarily unavailable. Email ${brand.email} instead.`,
      error,
    };
  }
}
