"use client";

import { useEffect, useState } from "react";
import { navigationLinkStyles } from "@/components/navigation/navigation-link-styles";

const navigation = [
  { href: "#overview", label: "Overview" },
  { href: "#timeline", label: "Timeline" },
  { href: "#deliverables", label: "Deliverables" },
  { href: "#updates", label: "Updates" },
] as const;

type PortalSectionEntry = Pick<IntersectionObserverEntry, "isIntersecting"> & {
  target: Pick<Element, "id">;
  boundingClientRect: Pick<DOMRectReadOnly, "top">;
};

export function firstVisiblePortalSection(entries: readonly PortalSectionEntry[]) {
  return entries
    .filter((entry) => entry.isIntersecting)
    .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]?.target.id;
}

export function portalSectionObserverRootMargin(viewportHeight: number) {
  const height = Number.isFinite(viewportHeight) ? Math.max(1, Math.floor(viewportHeight)) : 1;
  const topInset = Math.min(88, Math.max(0, height - 64));
  const maxBottomInset = Math.max(0, height - topInset - 64);
  const bottomInset = Math.min(Math.floor(height * 0.68), maxBottomInset);
  const topMargin = topInset === 0 ? 0 : -topInset;
  const bottomMargin = bottomInset === 0 ? 0 : -bottomInset;

  return `${topMargin}px 0px ${bottomMargin}px 0px`;
}

export function PortalNavigation({ companyName }: { companyName: string }) {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const sections = navigation
      .map((item) => document.querySelector(item.href))
      .filter((section): section is Element => section !== null);
    let observer: IntersectionObserver | null = null;
    let resizeFrame: number | null = null;
    let observerVersion = 0;

    const observeSections = () => {
      observer?.disconnect();
      const version = ++observerVersion;
      observer = new IntersectionObserver(
        (entries) => {
          if (version !== observerVersion) return;
          const firstVisibleId = firstVisiblePortalSection(entries);
          if (firstVisibleId) setActiveSection(firstVisibleId);
        },
        { rootMargin: portalSectionObserverRootMargin(window.innerHeight), threshold: 0 },
      );
      sections.forEach((section) => observer?.observe(section));
    };

    const handleResize = () => {
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        observeSections();
      });
    };

    observeSections();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      observerVersion += 1;
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-3">
        <a href="#portal-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Skip to portal content
        </a>
        <a href="#overview" className="min-w-0 sm:max-w-[14rem]">
          <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-primary">Yorkstead Systems</span>
          <span className="block truncate text-xs text-muted-foreground">{companyName}</span>
        </a>
        <nav aria-label="Portal sections" className="-mx-2 flex max-w-full snap-x gap-1 overflow-x-auto px-2 py-1 sm:mx-0 sm:justify-end sm:px-0">
          {navigation.map((item) => {
            const active = activeSection === item.href.slice(1);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "location" : undefined}
                onClick={() => setActiveSection(item.href.slice(1))}
                className={navigationLinkStyles("section", active)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
