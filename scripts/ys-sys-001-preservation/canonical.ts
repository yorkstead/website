import { createHash } from "node:crypto";

export const EVIDENCE_FORMAT = "ys-sys-001-preservation-baseline/v1" as const;

export type CanonicalValue = null | boolean | string | number | CanonicalValue[] | { [key: string]: CanonicalValue };

export function canonicalize(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical number must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
  return `{${entries.join(",")}}`;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalFingerprint(value: CanonicalValue): string {
  return sha256(canonicalize(value));
}
