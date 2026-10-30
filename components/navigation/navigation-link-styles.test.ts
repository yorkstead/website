import { describe, expect, test } from "bun:test";
import { navigationLinkStyles } from "@/components/navigation/navigation-link-styles";

describe("shared navigation link styles", () => {
  test("provides visible focus and semantic active-state styling on each surface", () => {
    for (const variant of ["site", "menu", "sidebar", "section"] as const) {
      const active = navigationLinkStyles(variant, true);
      const inactive = navigationLinkStyles(variant, false);
      expect(active).toContain("focus-visible:ring-ring");
      expect(active).toContain("text-primary");
      expect(inactive).toContain(variant === "menu" ? "text-foreground" : "text-muted-foreground");
    }
  });

  test("allows surface-specific layout classes without introducing a second token palette", () => {
    const classes = navigationLinkStyles("sidebar", false, "min-h-9 text-xs");
    expect(classes).toContain("min-h-9");
    expect(classes).toContain("bg-accent");
    expect(classes).not.toMatch(/(?:bg|text|border)-(?:slate|blue|gray|stone)-\d+/);
  });
});
