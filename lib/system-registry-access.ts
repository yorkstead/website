/** New typed registry operations require both this default-off gate and owner authorization. */
export function isTypedSystemRegistryAllowed(
  ownerAuthorized: boolean,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return ownerAuthorized === true && environment.YS_SYS_001_ENABLED === "true";
}
