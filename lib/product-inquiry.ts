import { confirmedNamedSystems, type ConfirmedNamedSystem } from "@/lib/engagements";

export const allowedProductIds = ["rework-flow", "union-os", "expanded-warehousing"] as const;
export type AllowedProductId = (typeof allowedProductIds)[number];

export type ProductInquiryIntake = {
  inquiryType: "product_inquiry";
  productId: AllowedProductId;
  productName: string;
  productPrice: string;
  productCategory: string;
};

export function isAllowedProductId(id: unknown): id is AllowedProductId {
  return typeof id === "string" && (allowedProductIds as readonly string[]).includes(id);
}

export function getProductInquiryDetails(productId: string | null | undefined): ConfirmedNamedSystem | null {
  if (!productId || !isAllowedProductId(productId)) return null;
  return confirmedNamedSystems.find((system) => system.id === productId) ?? null;
}
