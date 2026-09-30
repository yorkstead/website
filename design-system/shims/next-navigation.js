// Preview stand-ins for next/navigation: previews always sit on "/" with no query.
export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useRouter() {
  const noop = () => {};
  return { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop };
}
