export type AccessRecord = { id: string; status: string; revision: number };
export type ClientAccessView = {
  writesEnabled: boolean;
  organizationPage: number;
  organizationsMore: boolean;
  organizations: {
    id: string;
    name: string;
    status: string;
    revision: number;
  }[];
  selected: null | {
    id: string;
    name: string;
    status: string;
    revision: number;
    page: number;
    more: boolean;
    projects: (AccessRecord & {
      sourceExists: boolean;
      approvedContent: boolean;
      blockers: string[];
    })[];
    identities: {
      id: string;
      email: string;
      status: string;
      membershipStatus: string | null;
      role: string | null;
      revision: number | null;
      orphaned: boolean;
    }[];
    grants: {
      projectId: string;
      identityId: string;
      status: string;
      permission: string;
      revision: number;
      effective: boolean;
    }[];
    invitations: (AccessRecord & {
      recipient: string;
      expiresAt: string;
      expired: boolean;
      createdAt: string;
      redeemedAt: string | null;
      revokedAt: string | null;
      projects: string[];
    })[];
    preparations: {
      id: string;
      recipient: string;
      projects: string[];
      expiresInSeconds: number;
      createdAt: string;
      status: "prepared";
    }[];
    audit: {
      id: string;
      type: string;
      recordId: string;
      projectId: string | null;
      identityId: string | null;
      from: string | null;
      to: string;
      revision: number;
      actor: string;
      at: string;
    }[];
    invitationAudit: {
      id: string;
      invitationId: string;
      event: string;
      actor: string;
      at: string;
    }[];
    blockers: string[];
    launchReady: false;
  };
};
