"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Menu,
  PanelsTopLeft,
  Lightbulb,
  Settings2,
  ServerCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationLinkStyles } from "@/components/navigation/navigation-link-styles";
import { ThemeToggle } from "@/components/theme-toggle";

const preferenceKey = "yorkstead-dashboard-nav-collapsed";

type NavigationLink = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  active?: (pathname: string, query: URLSearchParams) => boolean;
  external?: boolean;
};

const primaryLinks: NavigationLink[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, active: (path) => path === "/dashboard" },
  { label: "CRM", href: "/dashboard/leads", icon: Users, active: (path) => path.startsWith("/dashboard/leads") || path.startsWith("/dashboard/consultations") || path.startsWith("/dashboard/opportunities") },
  { label: "Projects", href: "/dashboard#projects", icon: FolderKanban, active: (path) => path === "/dashboard" },
  { label: "Tasks", href: "/dashboard#tasks", icon: ListChecks, active: (path) => path === "/dashboard" },
  { label: "Automations", href: "/dashboard/automations", icon: Activity, active: (path) => path.startsWith("/dashboard/automations") },
  { label: "Insights", href: "/dashboard/analytics", icon: Gauge, active: (path) => ["/dashboard/analytics", "/dashboard/marketing", "/dashboard/operations"].some((prefix) => path.startsWith(prefix)) },
];

const crmLinks: NavigationLink[] = [
  { label: "Opportunity Discovery", href: "/dashboard/opportunities", icon: Lightbulb, active: (path) => path.startsWith("/dashboard/opportunities") },
  { label: "Overdue follow-ups", href: "/dashboard/leads?followUp=overdue", icon: BellRing, active: (_path, query) => query.get("followUp") === "overdue" },
  { label: "Due today", href: "/dashboard/leads?followUp=today", icon: CalendarDays, active: (_path, query) => query.get("followUp") === "today" },
  { label: "Upcoming follow-ups", href: "/dashboard/leads?followUp=upcoming", icon: CalendarDays, active: (_path, query) => query.get("followUp") === "upcoming" },
  { label: "Consultations", href: "/dashboard/consultations", icon: ClipboardCheck, active: (path) => path.startsWith("/dashboard/consultations") },
];

const insightLinks: NavigationLink[] = [
  { label: "Marketing", href: "/dashboard/marketing", icon: Activity, active: (path) => path.startsWith("/dashboard/marketing") },
  { label: "Operations", href: "/dashboard/operations", icon: Settings2, active: (path) => path.startsWith("/dashboard/operations") },
];

const toolLinks: NavigationLink[] = [
  { label: "Systems Directory", href: "/dashboard/systems", icon: ServerCog, active: (path) => path.startsWith("/dashboard/systems") },
  { label: "Client Access", href: "/dashboard/client-access", icon: Users, active: (path) => path.startsWith("/dashboard/client-access") },
  { label: "Client Publishing", href: "/dashboard/client-publishing", icon: FileText, active: (path) => path.startsWith("/dashboard/client-publishing") },
  { label: "Portal Preview", href: "/dashboard/customer-portal-preview", icon: PanelsTopLeft, active: (path) => path.startsWith("/dashboard/customer-portal-preview") || path.startsWith("/dashboard/client-publishing/preview") },
  { label: "Portal Readiness", href: "/dashboard/portal-readiness", icon: Gauge, active: (path) => path.startsWith("/dashboard/portal-readiness") },
  { label: "Customer Communications", href: "/dashboard/customer-communications", icon: ClipboardCheck, active: (path) => path.startsWith("/dashboard/customer-communications") },
  { label: "Marketing one-sheet", href: "/dashboard/marketing/one-sheet", icon: FileText, active: (path) => path.startsWith("/dashboard/marketing/one-sheet") },
  { label: "Account & passkeys", href: "/account", icon: BriefcaseBusiness, active: (path) => path === "/account" },
];

function routeIsActive(link: NavigationLink, pathname: string, query: URLSearchParams) {
  return link.active?.(pathname, query) ?? false;
}

function NavigationLogo({ size }: { size: "size-8" | "size-9" }) {
  return (
    <span className={cn("relative inline-block shrink-0", size)} aria-hidden="true">
      <Image
        src="/brand/logo/1x/logo-dark-transparent.png"
        alt=""
        width={36}
        height={36}
        sizes="36px"
        className="size-full object-contain dark:hidden"
      />
      <Image
        src="/brand/logo/1x/logo-light-transparent.png"
        alt=""
        width={36}
        height={36}
        sizes="36px"
        className="hidden size-full object-contain dark:block"
      />
    </span>
  );
}

function LinkItem({
  item,
  pathname,
  query,
  collapsed,
  onNavigate,
  nested = false,
}: {
  item: NavigationLink;
  pathname: string;
  query: URLSearchParams;
  collapsed: boolean;
  onNavigate: (href: string) => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const active = routeIsActive(item, pathname, query);
  const className = navigationLinkStyles(
    "sidebar",
    active,
    cn(nested && "min-h-9 text-xs", collapsed && "justify-center px-0"),
  );
  const content = <><Icon aria-hidden="true" className="size-[18px] shrink-0" /><span className={cn("min-w-0 truncate", collapsed && "sr-only")}>{item.label}</span>{item.external && !collapsed ? <ExternalLink aria-hidden="true" className="ml-auto size-3.5" /> : null}</>;
  const shared = {
    className,
    title: collapsed ? item.label : undefined,
    "aria-label": item.label,
    "aria-current": active ? "page" as const : undefined,
    onClick: () => onNavigate(item.href),
  };

  return item.external ? (
    <a {...shared} href={item.href} target="_blank" rel="noopener noreferrer">{content}</a>
  ) : (
    <Link {...shared} href={item.href}>{content}</Link>
  );
}

export function DashboardNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hash, setHash] = useState("");
  const openerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback((href?: string) => {
    if (href) {
      const destination = new URL(href, window.location.origin);
      setHash(destination.hash);
    }
    setMobileOpen(false);
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setCollapsed(window.localStorage.getItem(preferenceKey) === "true"); }
      catch { setCollapsed(false); }
      setPreferenceReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const closeOnHistoryNavigation = () => {
      setHash(window.location.hash);
      closeDrawer();
    };
    window.addEventListener("popstate", closeOnHistoryNavigation);
    return () => window.removeEventListener("popstate", closeOnHistoryNavigation);
  }, [closeDrawer]);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const firstControl = drawerRef.current?.querySelector<HTMLElement>("button:not([disabled]), a[href]");
    firstControl?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const controls = [...drawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")]
        .filter((element) => element.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDrawer, mobileOpen]);
  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem(preferenceKey, String(next)); } catch { /* Keep the in-session preference. */ }
      return next;
    });
  };

  const compact = preferenceReady && collapsed && !mobileOpen;
  const headingClass = cn("px-3 pb-1 pt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground", compact && "sr-only");
  const itemClass = (item: NavigationLink, nested = false) => {
    const onOverview = pathname === "/dashboard";
    const active = onOverview && ["Overview", "Projects", "Tasks"].includes(item.label)
      ? () => item.label === "Overview" ? !["#projects", "#tasks"].includes(hash) : item.label === "Projects" ? hash === "#projects" : hash === "#tasks"
      : item.active;
    return <LinkItem key={`${item.label}-${item.href}`} item={{ ...item, active }} pathname={pathname} query={new URLSearchParams(searchParams.toString())} collapsed={compact} onNavigate={closeDrawer} nested={nested} />;
  };

  return (
    <div className="flex min-h-screen w-full">
      <button
        type="button"
        aria-label="Dismiss navigation backdrop"
        tabIndex={-1}
        className={cn("fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden print:hidden", mobileOpen ? "block" : "hidden")}
        onClick={() => closeDrawer()}
      />
      <aside
        ref={drawerRef}
        id="dashboard-navigation"
        className={cn(
          "z-50 flex w-72 max-w-[calc(100vw-1rem)] shrink-0 flex-col border-r border-border/70 bg-card/95 px-3 py-4 shadow-xl backdrop-blur-xl transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none print:hidden",
          compact && "lg:w-[4.5rem]",
          mobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "hidden -translate-x-full lg:flex",
        )}
        aria-label="Yorkstead navigation"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? "true" : undefined}
      >
        <div className={cn("flex h-12 items-center gap-3 px-2", compact && "lg:justify-center lg:px-0")}>
          <NavigationLogo size="size-9" />
          <div className={cn("min-w-0", compact && "lg:hidden")}><div className="truncate text-sm font-semibold tracking-tight">YORKSTEAD</div><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Command Center</div></div>
          <button type="button" onClick={() => closeDrawer()} className="ml-auto grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden" aria-label="Close navigation drawer"><X className="size-4" /></button>
        </div>

        <nav className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Primary and tools navigation">
          <div className={headingClass}>Workspace</div>
          {primaryLinks.map((item) => itemClass(item))}
          <div className={cn("ml-7 mt-1 space-y-1 border-l border-border/70 pl-2", compact && "ml-0 border-l-0 pl-0")}>
            {crmLinks.map((item) => itemClass(item, true))}
            <div className="h-1" />
            {insightLinks.map((item) => itemClass(item, true))}
          </div>

          <div className={headingClass}>Settings &amp; Tools</div>
          {toolLinks.map((item) => itemClass(item))}
        </nav>

        <div className="border-t border-border/60 pt-3">
          <div className={cn("mb-2 flex items-center gap-3 px-3", compact && "justify-center px-0")}>
            <ThemeToggle />
            {!compact ? <span className="text-xs text-muted-foreground">Appearance</span> : null}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden min-h-10 w-full items-center gap-3 rounded-lg px-3 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            title={compact ? "Expand navigation" : undefined}
          >
            {collapsed ? <ChevronRight aria-hidden="true" className="mx-auto size-4" /> : <><ChevronLeft aria-hidden="true" className="size-4" /><span>Collapse navigation</span></>}
          </button>
          {compact ? <div className="sr-only" aria-live="polite">Navigation collapsed. Links remain available with accessible names.</div> : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:hidden print:hidden">
          <button ref={openerRef} type="button" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="dashboard-navigation" aria-label="Open navigation menu" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Menu className="size-5" />
          </button>
          <NavigationLogo size="size-8" />
          <span className="text-sm font-semibold tracking-tight">YORKSTEAD</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        {children}
      </div>
    </div>
  );
}
