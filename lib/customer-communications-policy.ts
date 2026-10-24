import { clientAccessDisposableEnabled } from "@/lib/client-access-schema";

// Deliberately not environment flags. Activation requires a separately reviewed change.
export const customerCommunicationsCapabilities = Object.freeze({
  productionDelivery: false,
  productionRecovery: false,
  productionWebhook: false,
} as const);
export function communicationsDisposableEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return clientAccessDisposableEnabled({
    ...env,
    CLIENT_ACCESS_DISPOSABLE: env.CUSTOMER_COMMUNICATIONS_DISPOSABLE,
  });
}
export class CommunicationsUnavailable extends Error {
  constructor() {
    super("Customer communications unavailable");
  }
}
