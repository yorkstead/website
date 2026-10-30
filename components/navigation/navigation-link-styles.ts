import { cn } from "@/lib/utils";

export type NavigationLinkVariant = "site" | "menu" | "sidebar" | "section";

/** Shared navigation treatment built only from Yorkstead's semantic theme tokens. */
export function navigationLinkStyles(
  variant: NavigationLinkVariant,
  active: boolean,
  className?: string,
) {
  const common = "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variantClasses: Record<NavigationLinkVariant, string> = {
    site: "inline-flex min-h-10 items-center whitespace-nowrap border-b-2 px-2 text-[10px] font-mono uppercase tracking-wider hover:text-foreground",
    menu: "flex min-h-11 items-center justify-between rounded-lg px-3 text-sm",
    sidebar: "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent hover:text-foreground",
    section: "inline-flex min-h-10 shrink-0 snap-start items-center whitespace-nowrap rounded-lg px-3 text-xs font-medium",
  };
  const stateClasses: Record<NavigationLinkVariant, string> = {
    site: active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border",
    menu: active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-accent",
    sidebar: active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground",
    section: active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
  };

  return cn(common, variantClasses[variant], stateClasses[variant], className);
}
