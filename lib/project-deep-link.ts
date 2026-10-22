import type { Project } from "@/lib/projects";

export type ProjectDeepLinkResolution =
  | { status: "none" }
  | { status: "found"; projectId: string }
  | { status: "not-found"; projectId: string };

export function resolveProjectDeepLink(projects: Pick<Project, "id">[], requestedId: string | null | undefined): ProjectDeepLinkResolution {
  const projectId = requestedId?.trim();
  if (!projectId) return { status: "none" };
  return projects.some((project) => project.id === projectId)
    ? { status: "found", projectId }
    : { status: "not-found", projectId };
}
