import { getOwnerSession } from "@/lib/owner-session";
import {
  compareRuntimeDatabaseIdentity,
  parseExpectedDatabaseIdentityJson,
} from "@/lib/ys-sys-001-database-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = 1024;
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
  Vary: "Cookie",
};

function identityResponse(result: "MATCH" | "MISMATCH" | "UNVERIFIED", status = 200) {
  return Response.json({ result, capturedAtUtc: new Date().toISOString() }, { status, headers: privateHeaders });
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > maxBodyBytes) return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getOwnerSession(request.headers))) return identityResponse("UNVERIFIED", 401);
  } catch {
    return identityResponse("UNVERIFIED", 503);
  }

  if (new URL(request.url).search || request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return identityResponse("UNVERIFIED", 400);
  }

  const body = await readBoundedBody(request);
  if (body === null) return identityResponse("UNVERIFIED", 400);

  const expected = parseExpectedDatabaseIdentityJson(body);
  if (!expected) return identityResponse("UNVERIFIED", 400);

  const result = compareRuntimeDatabaseIdentity(process.env.DATABASE_URL, expected);
  return identityResponse(result);
}
