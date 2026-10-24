import { getCustomerAuth } from "@/lib/customer-auth";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import {
  customerPortalCapabilities,
  getCustomerProjectAccess,
  type CustomerAuthorizationDatabase,
  type CustomerProjectAccess,
} from "@/lib/customer-portal-authorization";

export type VerifiedCustomerSession = {
  user: {
    id: string;
  };
  session: {
    expiresAt: Date | string;
  };
};

export type CustomerSessionVerifier = (
  requestHeaders: Headers,
) => Promise<VerifiedCustomerSession | null>;

type CustomerRequestAuthorization = {
  enabled: boolean;
  verifySession: CustomerSessionVerifier;
  now?: () => number;
};

function verifiedSubject(session: VerifiedCustomerSession, now: () => number) {
  const subject = session.user.id;
  const expiresAt = new Date(session.session.expiresAt).getTime();

  if (
    !subject ||
    subject !== subject.trim() ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now()
  ) {
    return null;
  }

  return subject;
}

export async function resolveCustomerProjectAccessForRequest(
  database: CustomerAuthorizationDatabase,
  requestHeaders: Headers,
  projectId: string,
  authorization: CustomerRequestAuthorization,
): Promise<CustomerProjectAccess | null> {
  if (!authorization.enabled) return null;

  const session = await authorization.verifySession(requestHeaders);
  if (!session) return null;

  const subject = verifiedSubject(session, authorization.now ?? Date.now);
  if (!subject) return null;

  return getCustomerProjectAccess(
    database,
    {
      provider: customerAuthBoundary.identityProvider,
      subject,
    },
    projectId,
  );
}

export async function getCustomerProjectAccessForRequest(
  database: CustomerAuthorizationDatabase,
  requestHeaders: Headers,
  projectId: string,
) {
  return resolveCustomerProjectAccessForRequest(database, requestHeaders, projectId, {
    enabled: customerPortalCapabilities.login,
    verifySession: async (headers) => getCustomerAuth().api.getSession({ headers }),
  });
}
