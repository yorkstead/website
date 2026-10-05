// pg treats sslmode=prefer|require|verify-ca as verify-full today and warns that this changes in pg v9.
// Spelling out verify-full keeps the current behavior and silences the warning. URLs that opt into
// libpq semantics with uselibpqcompat are left untouched.
export function explicitVerifyFullSSL(databaseURL: string) {
  let url: URL;
  try {
    url = new URL(databaseURL);
  } catch {
    return databaseURL;
  }
  if (url.searchParams.has("uselibpqcompat")) return databaseURL;
  // pg-connection-string honors the last sslmode when a URL repeats the parameter, so judge the effective (last) value.
  if (!["prefer", "require", "verify-ca"].includes(url.searchParams.getAll("sslmode").at(-1) ?? "")) return databaseURL;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
