import { createHash, randomBytes } from "node:crypto";

const processHashSalt = randomBytes(32).toString("hex");

function configuredSalt() {
  const configured = process.env.ANALYTICS_HASH_SALT ?? process.env.CONTACT_HASH_SALT ?? process.env.BETTER_AUTH_SECRET;
  return configured && configured !== "[SENSITIVE]" && !configured.startsWith("replace-with-") ? configured : processHashSalt;
}

export function hashedRequestAddress(requestHeaders: Headers, purpose: string, rotateDaily = false, date = new Date()) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip")?.trim() ?? "unknown";
  const salt = configuredSalt();
  const rotation = rotateDaily ? date.toISOString().slice(0, 10) : "stable";
  return createHash("sha256").update(`${salt}:${purpose}:${rotation}:${forwarded}`).digest("hex");
}

export function hashedAnalyticsSession(sessionId: string | undefined) {
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return createHash("sha256").update(`${configuredSalt()}:analytics-session:${sessionId}`).digest("hex");
}
