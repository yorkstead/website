import type { ClientProjectProjection, PublicationKind, SafePublication } from "@/lib/client-project-projection";

export type OwnerPublication = {
  id: string; sourceId: string; kind: PublicationKind; content: SafePublication;
  state: "private" | "draft" | "approved" | "withdrawn";
  revision: number; invalidated: boolean; actor: string | null; decidedAt: string | null;
};
export type OwnerPublishingView = {
  projects: { id: string; name: string; persisted: boolean }[];
  selected: null | {
    id: string; name: string; canPublish: boolean; reason: string | null;
    candidates: { kind: PublicationKind; sourceId: string; content: SafePublication; descriptionAvailable: boolean }[];
    excludedCandidates: { sourceId: string; reason: string }[];
    records: OwnerPublication[];
    preview: ClientProjectProjection | null;
    audit: { id: string; publicationId: string; revision: number; event: string; actor: string; role: string; from: string | null; to: string; at: string }[];
  };
};
