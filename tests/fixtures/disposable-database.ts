export function disposableTestDatabaseURL(env: Readonly<Record<string, string | undefined>> = process.env) {
  const testURL = env.TEST_DATABASE_URL;
  if (!testURL) return null;
  if (env.NODE_ENV === "production" || env.DATABASE_URL !== testURL) {
    throw new Error("Database integration tests require identical disposable DATABASE_URL and TEST_DATABASE_URL values");
  }
  const parsed = new URL(testURL);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
    !/(^|[_-])(test|disposable)([_-]|$)/i.test(parsed.pathname)
  ) {
    throw new Error("Database integration tests require a loopback disposable database whose name includes test or disposable");
  }
  return testURL;
}
