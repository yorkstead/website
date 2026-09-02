import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }} aria-hidden="true">
      <Image src="/brand/logo/yorkstead-transparent-light.png" alt="" width={size} height={size} className="size-full object-contain dark:hidden" priority />
      <Image src="/brand/logo/yorkstead-transparent-dark.png" alt="" width={size} height={size} className="hidden size-full object-contain dark:block" priority />
    </span>
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
