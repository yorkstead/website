export function customerEnrollmentEnabled(environment = process.env) {
  // Explicit isolated testing only. Production activation requires a separate reviewed change.
  if (!["development", "test"].includes(environment.NODE_ENV ?? ""))
    return false;
  if (environment.CUSTOMER_ENROLLMENT_DISPOSABLE !== "enabled") return false;
  try {
    const url = new URL(environment.DATABASE_URL ?? "");
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      !url.search &&
      !url.hash &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      /(^|_)(test|disposable)(_|$)/.test(url.pathname.slice(1)) &&
      environment.TEST_DATABASE_URL === environment.DATABASE_URL
    );
  } catch {
    return false;
  }
}
