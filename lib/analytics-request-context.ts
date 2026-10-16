export function analyticsDeviceType(userAgent: string | null): "desktop" | "mobile" | "tablet" | "bot" | "unknown" {
  if (!userAgent) return "unknown";
  if (/bot|crawler|spider|slurp|headless/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}
