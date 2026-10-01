import * as React from "react";

// Preview stand-in for next-themes: flips the preview frame's data-theme attribute.
export function useTheme() {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  const [theme, setState] = React.useState(() => root?.getAttribute("data-theme") ?? "light");
  const setTheme = (next) => {
    root?.setAttribute("data-theme", next);
    setState(next);
  };
  return { theme, resolvedTheme: theme, systemTheme: theme, themes: ["light", "dark"], setTheme };
}

export function ThemeProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}
