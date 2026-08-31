import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="6" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M8 8L16 16V24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
      <path d="M24 8L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
      <circle cx="16" cy="16" r="2" className="fill-primary" />
      <circle cx="16" cy="24" r="1.5" className="fill-foreground" />
    </svg>
  );
}

export function BrandMark({ showDescriptor = true, className }: { showDescriptor?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label={`${brand.name} — ${brand.descriptor}`} className={cn("inline-flex min-w-0 items-center gap-2.5 sm:gap-3", className)}>
      <BrandLogo />
      <span className="shrink-0 font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-foreground">
        {brand.wordmark}<span className="text-primary">{brand.domainSuffix}</span>
      </span>
      {showDescriptor ? <span className="hidden max-w-56 border-l border-border pl-3 font-mono text-[8px] uppercase leading-4 tracking-[0.16em] text-muted-foreground xl:block">{brand.descriptor}</span> : null}
    </Link>
  );
}
