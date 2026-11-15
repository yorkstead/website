"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button variant="outline" size="icon" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      <span className="relative inline-flex size-4 items-center justify-center">
        <Sun className="size-4 rotate-90 scale-0 opacity-0 transition-[transform,opacity] duration-200 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100" aria-hidden="true" />
        <Moon className="absolute size-4 rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-200 ease-out dark:-rotate-90 dark:scale-0 dark:opacity-0" aria-hidden="true" />
      </span>
    </Button>
  );
}
