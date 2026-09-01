"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Menu, MoveUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { CommandCenterButton } from "@/components/command-center-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/solutions", label: "Solutions" },
  { href: "/platform", label: "Platform" },
  { href: "/demos", label: "Demos" },
  { href: "/work", label: "Selected work" },
  { href: "/how-we-build", label: "How we build" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => href !== "/#contact" && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:h-16 lg:px-8">
        <BrandMark className="shrink-0" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="https://ops.yorkstead.com/demo"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary transition hover:border-primary/50 hover:bg-primary/15 sm:inline-flex"
          >
            Operations demo
            <MoveUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <ThemeToggle />
          <CommandCenterButton className="hidden h-9 sm:inline-flex" />

          <DropdownMenu.Root key={pathname} modal={false}>
            <DropdownMenu.Trigger
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open site navigation"
            >
              <Menu className="size-4" aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-2 shadow-2xl"
              >
                <DropdownMenu.Label className="px-3 pb-2 pt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Yorkstead Systems
                </DropdownMenu.Label>
                {navigation.map((item) => (
                  <DropdownMenu.Item key={item.href} asChild>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center justify-between rounded-lg px-3 text-sm outline-none transition data-[highlighted]:bg-accent data-[highlighted]:ring-1 data-[highlighted]:ring-inset data-[highlighted]:ring-ring",
                        isActive(item.href) ? "bg-primary/10 font-medium text-primary" : "text-foreground",
                      )}
                    >
                      {item.label}
                      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator className="my-2 h-px bg-border" />
                <DropdownMenu.Item asChild>
                  <a
                    href="https://ops.yorkstead.com/demo"
                    className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-primary outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:ring-1 data-[highlighted]:ring-inset data-[highlighted]:ring-ring sm:hidden"
                  >
                    Operations demo
                    <MoveUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                </DropdownMenu.Item>
                <CommandCenterButton className="min-h-11 w-full justify-between border-0 bg-transparent px-3 shadow-none sm:hidden" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="hidden border-t border-border/60 lg:block">
        <nav className="mx-auto flex max-w-7xl items-center gap-1 px-8" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 font-mono text-[10px] uppercase tracking-wider transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive(item.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
