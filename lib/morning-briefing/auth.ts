import { timingSafeEqual } from "node:crypto";

function secureEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function hasBearerAuthorization(request: Request, expectedToken: string | undefined) {
  if (!expectedToken || expectedToken.length < 16) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return secureEqual(authorization.slice(7), expectedToken);
}
