Warning: truncated output (original token count: 17012)
Total output lines: 916

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GoogleOperations } from "@/lib/dashboard-google-operations";
import type { AutomationHubDataResult } from "@/lib/automation-hub-data";
import type { CommandCenterCrmSnapshot } from "@/lib/contact-inquiries";
import type { AnalyticsOverviewSnapshot } from "@/lib/analytics-dashboard";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity, AlertCircle, Archive, ArrowRightCircle, BarChart3, CalendarDays, CheckCircle2, CircleDot,
  DatabaseBackup, Download, Inbox, KeyRound, CornerDownLeft, Grid2X2, Keyboard,
  Lightbulb, ListChecks, ListFilter, Pencil, BookOpenCheck, ClipboardCheck, DownloadCloud, Megaphone, Plus,
  RefreshCw, RotateCcw, RotateCw, Search, Settings, Sparkles, Square, Trash2, Upload, X,
} from "lucide-react";
import type { Project, ProjectKind } from "@/lib/projects";
import type { ClientDelivery } from "@/lib/client-delivery";
import { resolveProjectDeepLink } from "@/lib/project-deep-link";
import { defaultWorkspaceSettings, emptyWorkspace, workspaceStorageKey, type InboxItem, type ProjectNote, type Task, type WeeklyReview, type Workspace, type WorkspaceSettings } from "@/lib/workspace";
import { selectTasksForView } from "@/lib/planning";
import { isWorkspaceData, normalizeWorkspace } from "@/lib/workspace-validation";
import { createHistoryState, pushHistory, undoHistory, redoHistory, type WorkspaceHistoryState } from "@/lib/workspace-history";
import { cn } from "@/lib/utils";
import { dateKeyInTimeZone, normalizeTimeZone } from "@/lib/date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogBoundary } from "@/components/ui/dialog-boundary";
import { SyncConflictDialog } from "@/components/ui/sync-conflict-dialog";
import { readVersionedWorkspace, saveVersionedWorkspace } from "@/lib/versioned-workspace-client";
import { createWorkspaceSnapshotRequester, requestWorkspaceSnapshotRestore } from "@/lib/workspace-snapshot-client";
import { fetchProjectIntelligence, markProjectIntelligenceRefreshing, mergeProjectIntelligenceResults, type ProjectIntelligenceEntry } from "@/lib/project-intelligence-client";
import type { ComposerMode, Confirmation, ImportCandidate } from "@/components/dashboard/dashboard-feature-types";
import {
  Composer,
  ConfirmDialog,
  ProjectEditor,
  ProjectImportDialog,
  ProjectWorkspace,
  SettingsDialog,
  TaskEditor,
  WeeklyReviewDialog,
} from "@/components/dashboard/dashboard-dialogs";
import { AnalyticsSection, CalendarTimeline, DevelopmentQueue, NotificationManager, ProjectCard, ProjectJournal } from "@/components/dashboard/dashboard-sections";
import { QuickLaunch } from "@/components/dashboard/quick-launch";
import { CommandCenterOverview } from "@/components/dashboard/command-center-overview";
import { SystemsExceptions } from "@/components/dashboard/systems-exceptions";

type SyncState = "loading" | "saved" | "saving" | "offline" | "conflict";
type TaskView = "Today" | "Next" | "All";
type WorkspaceConflict = { local: Workspace; cloud: Workspace | null; cloudVersion: string | null; loading: boolean; resolving: boolean; error: string | null };
type SnapshotNotice = { tone: "success" | "error"; message: string; authenticationRequired?: boolean };
type SnapshotHistoryItem = { id: string; createdAt: string };
type UndoToast = { label: string; canUndo: boolean; canRedo: boolean; actionType: "mutate" | "undo" | "redo" };

export function Dashboard({ automationHub, googleOperations, crmSnapshot, crmUnavailable, crmReadAt, analyticsSnapshot, analyticsUnavailable, researchActions, researchUnavailable, researchTruncated, researchReadAt }: { automationHub: AutomationHubDataResult; googleOperations: GoogleOperations; crmSnapshot: CommandCenterCrmSnapshot | null; crmUnavailable: boolean; crmReadAt: string | null; analyticsSnapshot: AnalyticsOverviewSnapshot | null; analyticsUnavailable: boolean; researchActions: Array<{ id: string; business_name: string; industry: string; next_action: string; next_action_at: string; research_status: string }>; researchUnavailable: boolean; researchTruncated: boolean; researchReadAt: string | null }) {
  const router = useRouter();
  const requestedProjectId = useSearchParams().get("project");
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [googleDone,setGoogleDone]=useState<string[]>([]);
  const [googleBusy,setGoogleBusy]=useState<string|null>(null);
  const [googleError,setGoogleError]=useState("");
  const [history, setHistory] = useState<WorkspaceHistoryState>(() => createHistoryState(emptyWorkspace));
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [ready, setReady] = useState(false);


  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"All" | ProjectKind>("All");
  const [composer, setComposer] = useState<ComposerMode>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [projectLinkNotFound, setProjectLinkNotFound] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const resolution = resolveProjectDeepLink(workspace.projects, requestedProjectId);
    const timer = window.setTimeout(() => {
      if (resolution.status === "found") {
        setViewingProjectId(resolution.projectId);
        setProjectLinkNotFound(null);
      } else if (resolution.status === "not-found") {
        setViewingProjectId(null);
        setProjectLinkNotFound(resolution.projectId);
      } else {
        setViewingProjectId(null);
        setProjectLinkNotFound(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, workspace.projects, requestedProjectId]);
  const clearProjectDeepLink = useCallback(() => {
    setViewingProjectId(null);
    setProjectLinkNotFound(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("project");
    const query = url.searchParams.toString();
    router.replace(`${url.pathname}${query ? `?${query}` : ""}${url.hash}`, { scroll: false });
  }, [router]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskView, setTaskView] = useState<TaskView>("Today");
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [intelligence, setIntelligence] = useState<Record<string, ProjectIntelligenceEntry>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotHistoryItem[]>([]);
  const [snapshotting, setSnapshotting] = useState(false);
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [snapshotNotice, setSnapshotNotice] = useState<SnapshotNotice | null>(null);
  const [requestSnapshot] = useState(() => createWorkspaceSnapshotRequester());
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conflict, setConflict] = useState<WorkspaceConflict | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const workspaceVersionRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveGenerationRef = useRef(0);
  const conflictRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  const loadConflict = useCallback(async (local: Workspace) => {
    conflictRef.current = true;
    setSyncState("conflict");
    setConflict({ local, cloud: null, cloudVersion: null, loading: true, resolving: false, error: null });
    const result = await readVersionedWorkspace("/api/workspace", (value) => isWorkspaceData(value) ? normalizeWorkspace(value) : null);
    if (result.status === "error") {
      setConflict((current) => current ? { ...current, loading: false, error: "The current cloud workspace could not be loaded. Your local copy is still safe in this browser." } : current);
      return;
    }
    setConflict((current) => current ? { ...current, cloud: result.workspace ?? emptyWorkspace, cloudVersion: result.updatedAt, loading: false, error: null } : current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      let localWorkspace: Workspace = emptyWorkspace;
      try {
        const saved = localStorage.getItem(workspaceStorageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!isWorkspaceData(parsed)) throw new Error("Invalid local workspace");
          localWorkspace = normalizeWorkspace(parsed);
        }
      } catch {
        localStorage.removeItem(workspaceStorageKey);
      }
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Cloud read failed");
        const payload = await response.json() as { workspace: Workspace | null; updatedAt?: string | null; lastSnapshotAt?: string | null; snapshots?: SnapshotHistoryItem[] };
        if (cancelled) return;
        workspaceVersionRef.current = payload.updatedAt ?? null;
        if (payload.workspace) {
          const normalized = normalizeWorkspace(payload.workspace);
          setWorkspace(normalized);
          setHistory(createHistoryState(normalized));
          localStorage.setItem(workspaceStorageKey, JSON.stringify(normalized));
        } else {
          setWorkspace(localWorkspace);
          setHistory(createHistoryState(localWorkspace));
          if (localWorkspace.projects.length || localWorkspace.tasks.length || localWorkspace.activity.length) {
            const migrationResponse = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(localWorkspace) });
            if (!migrationResponse.ok) throw new Error("Cloud migration failed");
            const migrationPayload = await migrationResponse.json() as { updatedAt?: string };
            workspaceVersionRef.current = migrationPayload.updatedAt ?? null;
          }
        }
        setLastSnapshotAt(payload.lastSnapshotAt ?? null);
        setSnapshots((payload.snapshots ?? []).filter((snapshot) => /^[1-9]\d*$/.test(snapshot.id) && !Number.isNaN(Date.parse(snapshot.createdAt))));
        setSyncState("saved");
      } catch {
        if (cancelled) return;
        setWorkspace(localWorkspace);
        setHistory(createHistoryState(localWorkspace));
        setSyncState("offline");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(workspaceStorageKey, JSON.stringify(workspace));
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    if (conflictRef.current) return;
    const generation = ++saveGenerationRef.current;
    const timer = window.setTimeout(async () => {
      setSyncState("saving");
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
        if (generation !== saveGenerationRef.current) return;
        const result = await saveVersionedWorkspace("/api/workspace", workspace, workspaceVersionRef.current);
        if (result.status === "conflict") { if (generation === saveGenerationRef.current) await loadConflict(workspace); return; }
        if (result.status === "error") { if (generation === saveGenerationRef.current) setSyncState("offline"); return; }
        workspaceVersionRef.current = result.updatedAt ?? workspaceVersionRef.current;
        if (generation === saveGenerationRef.current) setSyncState("saved");
      });
      await saveQueueRef.current;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [loadConflict, ready, workspace]);

  const refreshIntelligence = useCallback(() => {
    const linked = workspace.projects.filter((project) => project.repo || project.deployment);
    if (!linked.length) return Promise.resolve();
    const projectIds = linked.map((project) => project.id);
    setRefreshing(true);
    setIntelligence((current) => markProjectIntelligenceRefreshing(current, projectIds));
    const running = Promise.allSettled(linked.map((project) => fetchProjectIntelligence(project)))
      .then((results) => { setIntelligence((current) => mergeProjectIntelligenceResults(current, projectIds, results)); })
      .finally(() => setRefreshing(false));
    return running;
  }, [workspace.projects]);

  const intelligenceKey = workspace.projects.map((project) => `${project.id}:${project.repo ?? ""}:${project.deployment ?? ""}`).join("|");
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void refreshIntelligence(), 0);
    return () => window.clearTimeout(timer);
  }, [ready, intelligenceKey, refreshIntelligence]);

  useEffect(() => {
    if (!undoToast) return;
    const timer = window.setTimeout(() => setUndoToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [undoToast]);

  const updateWorkspace = useCallback((label: string, updater: (current: Workspace) => Workspace) => {
    setWorkspace((current) => {
      const next = updater(current);
      setHistory((prevHistory) => pushHistory(prevHistory, label, next));
      setUndoToast({
        label,
        canUndo: true,
        canRedo: false,
        actionType: "mutate",
      });
      return next;
    });
  }, []);

  const performUndo = useCallback(() => {
    let undone = false;
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) return currentHistory;
      const result = undoHistory(currentHistory);
      if (result.undoneEntry) {
        undone = true;
        setWorkspace(result.state.present);
        setUndoToast({
          label: `Undid "${result.undoneEntry.label}"`,
          canUndo: result.state.past.length > 0,
          canRedo: result.state.future.length > 0,
          actionType: "undo",
        });
        return result.state;
      }
      return currentHistory;
    });
    return undone;
  }, []);

  const performRedo = useCallback(() => {
    let redone = false;
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) return currentHistory;
      const result = redoHistory(currentHistory);
      if (result.redoneEntry) {
        redone = true;
        setWorkspace(result.state.present);
        setUndoToast({
          label: `Redid "${result.redoneEntry.label}"`,
          canUndo: result.state.past.length > 0,
          canRedo: result.state.future.length > 0,
          actionType: "redo",
        });
        return result.state;
      }
      return currentHistory;
    });
    return redone;
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);

      // Ctrl+Z or Cmd+Z -> Undo (if not actively typing in an input field)
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        if (!isTyping) {
          event.preventDefault();
          performUndo();
          return;
        }
      }

      // Ctrl+Shift+Z, Cmd+Shift+Z, or Ctrl+Y -> Redo
      if (
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y")
      ) {
        if (!isTyping) {
          event.preventDefault();
          performRedo();
          return;
        }
      }

      if (!isTyping && event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setComposer("task");
      }
      if (!isTyping && event.altKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setComposer("idea");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [performUndo, performRedo]);

  function record(message: string) {
    return { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
  }
  function addProject(project: Project) {
    updateWorkspace(`Created project · ${project.name}`, (current) => ({
      ...current,
      projects: [project, ...current.projects],
      activity: [record(`Created project · ${project.name}`), ...current.activity].slice(0, 30),
    }));
  }
  function addTask(title: string, projectId?: string, priority?: Task["priority"], dueDate?: string) {
    updateWorkspace(`Added task · ${title}`, (current) => ({
      ...current,
      tasks: [
        {
          id: crypto.randomUUID(),
          title,
          projectId,
          priority: priority ?? current.settings?.defaultTaskPriority ?? "Medium",
          dueDate,
          done: false,
          createdAt: new Date().toISOString(),
        },
        ...current.tasks,
      ],
      activity: [record(`Added task · ${title}`), ...current.activity].slice(0, 30),
    }));
  }
  function addIdea(idea: string) {
    updateWorkspace(`Captured idea · ${idea.length > 32 ? `${idea.slice(0, 30)}…` : idea}`, (current) => ({
      ...current,
      inbox: [{ id: crypto.randomUUID(), text: idea, createdAt: new Date().toISOString() }, ...(current.inbox ?? [])],
      activity: [record(`Captured idea · ${idea}`), ...current.activity].slice(0, 30),
    }));
  }
  function toggleTask(id: string) {
    const task = workspace.tasks.find((item) => item.id === id);
    const actionLabel = task ? `${task.done ? "Reopened" : "Completed"} task · ${task.title}` : "Toggled task";
    updateWorkspace(actionLabel, (current) => {
      const target = current.tasks.find((item) => item.id === id);
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === id
            ? { ...item, done: !item.done, completedAt: item.done ? undefined : new Date().toISOString() }
            : item
        ),
        activity: target
          ? [record(`${target.done ? "Reopened" : "Completed"} task · ${target.title}`), ...current.activity].slice(0, 30)
          : current.activity,
      };
    });
  }
  function deleteProject(id: string) {
    const project = workspace.projects.find((item) => item.id === id);
    if (!project) return;
    setConfirmation({
      title: `Delete ${project.name}?`,
      message: "The project will be removed and its tasks moved to General. You can undo this change with Ctrl+Z.",
      actionLabel: "Delete project",
      onConfirm: () => {
        updateWorkspace(`Deleted project · ${project.name}`, (current) => ({
          ...current,
          projects: current.projects.filter((item) => item.id !== id),
          tasks: current.tasks.map((task) => (task.projectId === id ? { ...task, projectId: undefined } : task)),
          activity: [record(`Removed project · ${project.name}`), ...current.activity].slice(0, 30),
        }));
      },
    });
  }
  function updateProject(project: Project) {
    updateWorkspace(`Updated project · ${project.name}…7012 tokens truncated…    >
                <span>Undo</span>
                <kbd className="hidden rounded border border-border/80 bg-background/80 px-1 py-0.2 font-mono text-[9px] text-muted-foreground sm:inline-block">
                  Ctrl+Z
                </kbd>
              </Button>
            )}

            {undoToast.canRedo && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={performRedo}
              >
                <span>Redo</span>
                <kbd className="hidden rounded border border-border/80 bg-background/80 px-1 py-0.2 font-mono text-[9px] text-muted-foreground sm:inline-block">
                  Ctrl+Y
                </kbd>
              </Button>
            )}

            <button
              onClick={() => setUndoToast(null)}
              aria-label="Dismiss notification"
              className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen w-full min-w-0 max-w-[1600px]">
        <main className="min-w-0 flex-1 px-4 pb-8 sm:px-6 xl:px-10">
          <header className="flex h-20 min-w-0 items-center justify-between border-b border-border/60"><div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><CircleDot className={cn("size-3 shrink-0", syncState === "offline" || syncState === "conflict" ? "text-amber-400" : "text-emerald-400")} /><span className="hidden truncate sm:inline">{syncState === "offline" ? "Working offline" : syncState === "conflict" ? "Resolve the cloud conflict" : syncState === "saving" ? "Saving…" : "Workspace ready"}</span></div><div className="flex shrink-0 items-center gap-2"><Button variant="outline" className="hidden text-muted-foreground md:flex" onClick={() => setCommandOpen(true)}><Search />Commands <kbd className="ml-4 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">Ctrl K</kbd></Button><Button variant="outline" size="icon" onClick={() => void refreshIntelligence()} aria-label="Refresh project status" disabled={refreshing}><RefreshCw className={cn(refreshing && "animate-spin")} /></Button><Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Workspace settings"><Settings className="size-4" /></Button><Button variant="outline" size="icon" onClick={() => setComposer("task")} aria-label="New task"><ListChecks className="size-4" /></Button><Button onClick={() => setComposer("project")}><Plus /><span className="hidden sm:inline">New project</span></Button></div></header>

          {projectLinkNotFound && <section role="alert" className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:flex-row sm:items-center"><div><div className="text-sm font-semibold">Project link not found</div><p className="mt-1 text-xs text-muted-foreground">The requested project <span className="font-mono">{projectLinkNotFound}</span> is not in the current workspace. No records were changed.</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" asChild><Link href="/dashboard/leads">Review leads</Link></Button><Button size="sm" onClick={clearProjectDeepLink}>View current projects</Button></div></section>}

          <section className="py-7 sm:py-9"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Command Center · Overview</div><h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">What needs attention today?</h1><p className="mt-2 text-sm text-muted-foreground">Your follow-ups, delivery work, and next actions in one place.</p></div><Button className="self-start sm:self-auto" onClick={() => setComposer("task")}><Plus />Create task</Button></div></section>
          <SystemsExceptions projects={workspace.projects} intelligence={intelligence} onRefreshIntelligence={refreshIntelligence} intelligenceRefreshing={refreshing} />
          <CommandCenterOverview
            crm={crmSnapshot}
            crmUnavailable={crmUnavailable}
            analyticsSnapshot={analyticsSnapshot}
            analyticsUnavailable={analyticsUnavailable}
            projects={workspace.projects}
            tasks={workspace.tasks}
            googleTasks={googleVisible}
            activity={workspace.activity}
            today={commandCenterToday}
            staleProjectDays={workspace.settings?.staleProjectDays ?? 14}
            ready={ready}
            automationHub={automationHub}
            onCompleteTask={toggleTask}
            onOpenTask={setEditingTask}
            onCompleteGoogleTask={(task) => void finishGoogleTask(task)}
            onCreateTask={() => setComposer("task")}
            researchActions={researchActions}
            researchUnavailable={researchUnavailable}
            researchTruncated={researchTruncated}
            crmReadAt={crmReadAt}
            researchReadAt={researchReadAt}
            intelligence={intelligence}
          />

          <ProjectJournal projects={workspace.projects} notes={workspace.notes ?? []} onAdd={addProjectNote} onDelete={deleteProjectNote} />
          <DevelopmentQueue projects={workspace.projects} intelligence={intelligence} />
          <AnalyticsSection tasks={workspace.tasks} projects={workspace.projects} today={today} timeZone={timeZone} />
          <CalendarTimeline tasks={workspace.tasks} projects={workspace.projects} todayKey={today} onEdit={setEditingTask} onToggle={toggleTask} googleAgenda={googleOperations.agenda} />{googleOperations.calendarState !== "available" ? <p className="mt-2 text-xs text-amber-600" role="status">Google Calendar · {googleOperations.calendarState}: {googleOperations.calendarDetail} The agenda is not represented as empty.</p> : null}

          <section id="projects" className="min-w-0"><div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-base font-semibold">Project grid</h2><p className="mt-1 text-xs text-muted-foreground">{filtered.length} projects visible</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none sm:w-64" /></label><div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"><ListFilter className="mx-2 size-3.5 shrink-0 text-muted-foreground" />{kinds.map((item) => <button key={item} onClick={() => setKind(item)} className={cn("rounded-md px-2.5 py-1.5 text-xs transition", kind === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{item}</button>)}</div></div></div>
            {filtered.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((project) => <ProjectCard key={project.id} project={project} intelligenceEntry={intelligence[project.id]} onOpen={() => setViewingProjectId(project.id)} onEdit={() => setEditingProject(project)} onDelete={() => deleteProject(project.id)} />)}</div> : <Card className="min-w-0"><CardContent className="grid min-h-64 place-items-center text-center"><div><Sparkles className="mx-auto mb-3 size-7 text-primary" /><h3 className="font-medium">Clean slate</h3><p className="mt-1 text-sm text-muted-foreground">Create your first project when you&apos;re ready.</p><Button className="mt-5" onClick={() => setComposer("project")}><Plus />New project</Button></div></CardContent></Card>}
          </section>

          <section className="mt-10 grid min-w-0 gap-4 xl:grid-cols-[1.15fr_1fr]">
            <Card id="tasks" className="min-w-0 overflow-hidden"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Tasks</h2><p className="mt-1 text-xs text-muted-foreground">WORK//CTRL and Google tasks in one view.</p></div><Button size="sm" variant="outline" className="shrink-0" onClick={() => setComposer("task")}><Plus />Add task</Button></div><div className="mb-4 flex gap-1 rounded-lg border border-border bg-background/50 p-1">{(["Today", "Next", "All"] as TaskView[]).map((view) => <button key={view} onClick={() => setTaskView(view)} className={cn("flex-1 rounded-md px-3 py-1.5 text-xs transition", taskView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{view}</button>)}</div>{googleOperations && <div className="mb-4 space-y-2"><div className="flex items-center justify-between"><span className={`font-mono text-[9px] uppercase tracking-widest ${googleOperations.tasksState === "unavailable" ? "text-amber-600" : "text-primary"}`}>Google Tasks · {googleOperations.tasksState === "unavailable" ? "Unavailable" : googleOperations.tasksState === "partial" ? "Partial" : "Synced"}</span><a href="https://cal.yorkstead.com/command" className="text-[10px] text-primary">Manage in Daily Operations →</a></div>{googleError&&<p role="alert" className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{googleError}</p>}{(() => {const rows=googleVisible.filter(t=>taskView==="Today"?t.due<=today:taskView==="Next"?t.due>today:true);return rows.length?<div className="space-y-1">{rows.map(task=><div key={task.listId+":"+task.id} className="flex min-w-0 items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"><button type="button" disabled={!!googleBusy} onClick={()=>void finishGoogleTask(task)} title={"Complete "+task.title} aria-label={"Complete "+task.title} className="shrink-0 text-primary hover:text-foreground disabled:opacity-50"><Square className="size-4"/></button><span className="mt-0.5 shrink-0 font-mono text-[9px] text-primary">Google</span><span className="min-w-0 flex-1">{task.title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{task.due<today?"Overdue":task.due===today?"Today":"Tomorrow"}</span></div>)}</div>:<p className="text-xs text-muted-foreground">No Google Tasks in this date range.</p>;})()}<p className="text-[10px] text-muted-foreground">Google list covers overdue, today and tomorrow; WORK//CTRL tasks appear below. Completion syncs to Google.</p></div>}{visibleTasks.length ? <div className="space-y-5 min-w-0">{Object.entries(taskGroups).map(([group, tasks]) => <div key={group} className="min-w-0"><div className="mb-1 truncate px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{group}</div><div className="space-y-1">{tasks.map((task) => { const overdue = !task.done && Boolean(task.dueDate && task.dueDate < today); return <div key={task.id} className="group/task flex min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-2.5 hover:bg-accent/50"><div className="flex min-w-0 flex-1 items-center gap-2"><button onClick={() => toggleTask(task.id)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={task.done ? "Reopen task" : "Complete task"}>{task.done ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Square className="size-4" />}</button><div className="min-w-0 flex-1"><div className={cn("truncate text-xs", task.done && "text-muted-foreground line-through")}>{task.title}</div>{task.notes && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{task.notes}</div>}</div></div><div className="flex shrink-0 items-center gap-1.5"><Badge className={cn("shrink-0 border-border text-[10px]", task.priority === "High" ? "border-red-500/20 bg-red-500/10 text-red-500" : task.priority === "Low" ? "bg-secondary text-muted-foreground" : "border-amber-500/20 bg-amber-500/10 text-amber-500")}>{task.priority ?? "Medium"}</Badge>{task.dueDate && <span className={cn("flex shrink-0 items-center gap-1 font-mono text-[9px] whitespace-nowrap", overdue ? "text-red-500" : "text-muted-foreground")}>{overdue ? <AlertCircle className="size-3 shrink-0" /> : <CalendarDays className="size-3 shrink-0" />}{task.dueDate.slice(5)}</span>}<Button size="icon" variant="ghost" className="size-7 shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100" onClick={() => setEditingTask(task)} aria-label={`Edit ${task.title}`}><Pencil className="size-3.5" /></Button><Button size="icon" variant="ghost" className="size-7 shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 className="size-3.5" /></Button></div></div>})}</div></div>)}</div> : <div className="grid min-h-32 place-items-center text-center text-xs text-muted-foreground">{taskView === "Today" ? "Nothing due today. You're clear." : taskView === "Next" ? "No upcoming tasks." : "No tasks yet. Add one useful next action."}</div>}</CardContent></Card>
            <QuickLaunch
              projects={workspace.projects}
              intelligence={intelligence}
              githubUsername={workspace.settings?.githubUsername}
              vercelTeam={workspace.settings?.vercelTeam}
              onNewTask={() => setComposer("task")}
              onNewIdea={() => setComposer("idea")}
              onNewProject={() => setComposer("project")}
              onOpenProject={(id) => setViewingProjectId(id)}
              onEditProject={(project) => setEditingProject(project)}
              onImportOpen={() => setImportOpen(true)}
            />
          </section>

          <section id="inbox" className="mt-4 min-w-0"><Card className="min-w-0 overflow-hidden"><CardContent className="p-5"><div className="mb-5 flex items-center justify-between"><div><div className="flex items-center gap-2"><Inbox className="size-4 text-primary" /><h2 className="text-sm font-semibold">Capture inbox</h2></div><p className="mt-1 text-xs text-muted-foreground">Ideas stay loose until you decide what they should become.</p></div><Button variant="outline" size="sm" onClick={() => setComposer("idea")}><Plus />Capture</Button></div>{workspace.inbox?.length ? <div className="space-y-2">{workspace.inbox.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/45 p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm leading-5">{item.text}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">Captured {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => inboxToTask(item)}><ArrowRightCircle />Task</Button><Button variant="ghost" size="sm" onClick={() => inboxToProject(item)}><Grid2X2 />Project</Button><Button variant="ghost" size="icon" onClick={() => archiveInboxItem(item)} aria-label="Archive inbox item"><Archive /></Button></div></div>)}</div> : <div className="grid min-h-28 place-items-center text-center"><div><CheckCircle2 className="mx-auto mb-2 size-5 text-emerald-400" /><p className="text-xs text-muted-foreground">Inbox zero. Nothing waiting for a decision.</p></div></div>}</CardContent></Card></section>

          <section className="mt-4 min-w-0"><Card className="min-w-0 overflow-hidden"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="mb-2 flex items-center gap-2"><BookOpenCheck className="size-4 text-primary" /><h2 className="text-sm font-semibold">Weekly review</h2></div>{workspace.reviews?.[0] ? <div><p className="text-xs text-muted-foreground">Last completed {new Date(workspace.reviews[0].createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p><p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6"><span className="font-medium">Next:</span> {workspace.reviews[0].nextPriorities || "No priorities recorded."}</p></div> : <p className="text-xs text-muted-foreground">No review yet. Close your first operating loop.</p>}</div><Button variant="outline" onClick={() => setReviewOpen(true)}><BookOpenCheck />{workspace.reviews?.length ? "New review" : "Start review"}</Button></div></CardContent></Card></section>
          <section className="mt-4 min-w-0"><NotificationManager /></section>
          <section className="mt-4 min-w-0"><Card className="min-w-0 overflow-hidden"><CardContent className="p-5">
            <div className="mb-5"><h2 className="text-sm font-semibold">Data safety</h2><p className="mt-1 text-xs text-muted-foreground">Portable backups and the 10 newest recovery points. Cloud storage retains the newest 30 snapshots.</p></div>
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importWorkspace(file); }} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Button variant="outline" className="justify-start" onClick={exportWorkspace}><Download />Export JSON</Button><Button variant="outline" className="justify-start" onClick={() => importInputRef.current?.click()}><Upload />Import backup</Button><Button variant="outline" className="justify-start" onClick={() => void createSnapshot()} disabled={snapshotting || Boolean(restoringSnapshotId)}><DatabaseBackup className={cn(snapshotting && "animate-pulse")} />{snapshotting ? "Creating snapshot…" : "Cloud snapshot"}</Button><Button variant="outline" className="justify-start text-red-500 hover:text-red-500" onClick={resetWorkspace}><RotateCcw />Reset workspace</Button></div>
            {snapshotNotice && <div role={snapshotNotice.tone === "error" ? "alert" : "status"} className={cn("mt-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs", snapshotNotice.tone === "success" ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400" : "border-amber-500/25 bg-amber-500/5 text-amber-400")}><span>{snapshotNotice.message}</span><span className="flex shrink-0 items-center gap-2">{snapshotNotice.authenticationRequired && <a href="/login?next=/dashboard" className="font-medium underline underline-offset-4">Sign in</a>}<button onClick={() => setSnapshotNotice(null)} aria-label="Dismiss snapshot message"><X className="size-3.5" /></button></span></div>}
            <div className="mt-4 border-t border-border pt-4"><div className="mb-2 flex items-center justify-between gap-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{lastSnapshotAt ? `Last cloud snapshot · ${new Date(lastSnapshotAt).toLocaleString()}` : "No cloud snapshot yet"}</div>{snapshots.length ? <span className="text-[10px] text-muted-foreground">Newest {snapshots.length}</span> : null}</div>{snapshots.length ? <div className="grid gap-2 sm:grid-cols-2">{snapshots.map((snapshot) => <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"><span className="text-xs text-muted-foreground">{new Date(snapshot.createdAt).toLocaleString()}</span><Button size="sm" variant="ghost" disabled={Boolean(restoringSnapshotId) || snapshotting} onClick={() => confirmSnapshotRestore(snapshot)}><RotateCcw className={cn(restoringSnapshotId === snapshot.id && "animate-spin")} />{restoringSnapshotId === snapshot.id ? "Restoring…" : "Restore"}</Button></div>)}</div> : null}</div>
          </CardContent></Card></section>
        </main>
      </div>
    </div>
  );
}
