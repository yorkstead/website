"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Menu, MoveUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigationLinkStyles } from "@/components/navigation/navigation-link-styles";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/solutions", label: "Solutions" },
  { href: "/platform", label: "Platform" },
  { href: "/work", label: "Work" },
  { href: "/demos", label: "Walkthroughs" },
  { href: "/packages", label: "Pricing & Model" },
  { href: "/about", label: "About" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => href !== "/#contact" && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:h-16 lg:gap-4 lg:px-8">
        <BrandMark showDescriptor={false} className="shrink-0" />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={navigationLinkStyles("site", isActive(item.href))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="/demos"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary transition hover:border-primary/50 hover:bg-primary/15 md:inline-flex xl:hidden"
          >
            Walkthroughs
            <MoveUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <ThemeToggle />

          <DropdownMenu.Root key={pathname} modal={false}>
            <DropdownMenu.Trigger
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
              aria-label="Open site navigation"
              aria-controls="public-site-navigation"
            >
              <Menu className="size-4" aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                id="public-site-navigation"
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
                        navigationLinkStyles("menu", isActive(item.href)),
                        "data-[highlighted]:bg-accent data-[highlighted]:ring-1 data-[highlighted]:ring-inset data-[highlighted]:ring-ring",
                      )}
                    >
                      {item.label}
                      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

    </header>
  );
}
