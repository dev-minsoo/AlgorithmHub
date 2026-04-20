import { useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "../core/types/domain";

export type ResolvedTheme = "light" | "dark";

export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark: boolean
): ResolvedTheme {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return mode;
}

export function useResolvedTheme(mode: ThemeMode): ResolvedTheme {
  const getPreferred = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [prefersDark, setPrefersDark] = useState(getPreferred);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  return useMemo(
    () => resolveThemeMode(mode, prefersDark),
    [mode, prefersDark]
  );
}
