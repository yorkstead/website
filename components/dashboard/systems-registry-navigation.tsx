import Link from "next/link";

const links = [
  { href: "/dashboard/systems/registry", label: "Inventory" },
  { href: "/dashboard/systems/registry/impact", label: "Dependency impact" },
  { href: "/dashboard/systems/registry/readiness", label: "Activation readiness" },
] as const;

export function SystemsRegistryNavigation({ current }: { current: (typeof links)[number]["href"] }) {
  return <nav aria-label="Systems Registry views" className="mt-5 flex flex-wrap gap-2">
    {links.map((link) => <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${current === link.href ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
      {link.label}
    </Link>)}
  </nav>;
}
