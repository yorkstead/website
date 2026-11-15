import { cn } from "@/lib/utils";

export type NavigationLinkVariant = "site" | "menu" | "sidebar" | "section";

/** Shared navigation treatment built only from Yorkstead's semantic theme tokens. */
export function navigationLinkStyles(
  variant: NavigationLinkVariant,
  active: boolean,
  className?: string,
) {
  const common = "outline-none transition-[colors,transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variantClasses: Record<NavigationLinkVariant, string> = {
    site: "relative inline-flex min-h-10 items-center whitespace-nowrap px-2 text-[10px] font-mono uppercase tracking-wider hover:text-foreground after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:transition-transform after:duration-200 after:ease-out",
    menu: "flex min-h-11 items-center justify-between rounded-lg px-3 text-sm",
    sidebar: "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent hover:text-foreground",
    section: "inline-flex min-h-10 shrink-0 snap-start items-center whitespace-nowrap rounded-lg px-3 text-xs font-medium",
  };
  const stateClasses: Record<NavigationLinkVariant, string> = {
    site: active ? "text-primary after:scale-x-100 after:bg-primary" : "text-muted-foreground after:scale-x-0 after:bg-border hover:after:scale-x-75",
    menu: active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-accent",
    sidebar: active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground",
    section: active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
  };

  return cn(common, variantClasses[variant], stateClasses[variant], className);
}
